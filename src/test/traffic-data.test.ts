import { describe, it, expect } from "vitest";
import { getTrafficLevel, getSignalTime, generateRandomUpdate, IntersectionData } from "../lib/traffic-data";

describe("Traffic Data Logic Helpers", () => {
  describe("getTrafficLevel", () => {
    it("should return LOW for vehicle counts 10 or less", () => {
      expect(getTrafficLevel(0)).toBe("LOW");
      expect(getTrafficLevel(5)).toBe("LOW");
      expect(getTrafficLevel(10)).toBe("LOW");
    });

    it("should return MEDIUM for vehicle counts between 11 and 25", () => {
      expect(getTrafficLevel(11)).toBe("MEDIUM");
      expect(getTrafficLevel(18)).toBe("MEDIUM");
      expect(getTrafficLevel(25)).toBe("MEDIUM");
    });

    it("should return HIGH for vehicle counts greater than 25", () => {
      expect(getTrafficLevel(26)).toBe("HIGH");
      expect(getTrafficLevel(50)).toBe("HIGH");
      expect(getTrafficLevel(100)).toBe("HIGH");
    });
  });

  describe("getSignalTime", () => {
    it("should return 20s for vehicle counts under 10", () => {
      expect(getSignalTime(0)).toBe(20);
      expect(getSignalTime(5)).toBe(20);
      expect(getSignalTime(9)).toBe(20);
    });

    it("should return 40s for vehicle counts between 10 and 25 inclusive", () => {
      expect(getSignalTime(10)).toBe(40);
      expect(getSignalTime(18)).toBe(40);
      expect(getSignalTime(25)).toBe(40);
    });

    it("should return 60s for vehicle counts greater than 25", () => {
      expect(getSignalTime(26)).toBe(60);
      expect(getSignalTime(50)).toBe(60);
    });
  });

  describe("generateRandomUpdate", () => {
    it("should correctly update vehicle counts, traffic level, and signal times", () => {
      const mockIntersection: IntersectionData = {
        intersection_id: "TEST_01",
        name: "Test Rd & Demo Ave",
        vehicle_count: 20,
        traffic_level: "MEDIUM",
        signal_time: 40,
        timestamp: new Date().toISOString(),
        lat: 28.6139,
        lng: 77.209,
        cars: 10,
        bikes: 5,
        buses: 3,
        trucks: 2,
      };

      const updated = generateRandomUpdate(mockIntersection);

      // Verify fields are updated and counts remain non-negative
      expect(updated.cars).toBeGreaterThanOrEqual(0);
      expect(updated.bikes).toBeGreaterThanOrEqual(0);
      expect(updated.buses).toBeGreaterThanOrEqual(0);
      expect(updated.trucks).toBeGreaterThanOrEqual(0);

      // Verify total count matches sum of vehicle classes
      const calculatedSum = updated.cars + updated.bikes + updated.buses + updated.trucks;
      expect(updated.vehicle_count).toBe(calculatedSum);

      // Verify density level and signal time matches the new count
      expect(updated.traffic_level).toBe(getTrafficLevel(calculatedSum));
      expect(updated.signal_time).toBe(getSignalTime(calculatedSum));
      expect(updated.timestamp).toBeDefined();
    });
  });
});
