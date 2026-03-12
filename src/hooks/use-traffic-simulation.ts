import { useState, useEffect, useCallback } from "react";
import { IntersectionData, INTERSECTIONS, generateRandomUpdate } from "@/lib/traffic-data";

export function useTrafficSimulation(intervalMs = 3000) {
  const [intersections, setIntersections] = useState<IntersectionData[]>(INTERSECTIONS);

  useEffect(() => {
    const timer = setInterval(() => {
      setIntersections((prev) => prev.map(generateRandomUpdate));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  const totalVehicles = intersections.reduce((s, i) => s + i.vehicle_count, 0);

  const overallLevel = totalVehicles > 80 ? "HIGH" : totalVehicles > 40 ? "MEDIUM" : "LOW";

  return { intersections, totalVehicles, overallLevel };
}
