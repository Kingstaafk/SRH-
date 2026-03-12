export interface IntersectionData {
  intersection_id: string;
  name: string;
  vehicle_count: number;
  traffic_level: "LOW" | "MEDIUM" | "HIGH";
  signal_time: number;
  timestamp: string;
  lat: number;
  lng: number;
  cars: number;
  bikes: number;
  buses: number;
  trucks: number;
}

export type SignalState = "RED" | "YELLOW" | "GREEN";

export interface TrafficSignal {
  direction: "north" | "south" | "east" | "west";
  state: SignalState;
  timer: number;
}

export function getTrafficLevel(count: number): "LOW" | "MEDIUM" | "HIGH" {
  if (count <= 10) return "LOW";
  if (count <= 25) return "MEDIUM";
  return "HIGH";
}

export function getSignalTime(count: number): number {
  if (count < 10) return 20;
  if (count <= 25) return 40;
  return 60;
}

// Simulated intersections
export const INTERSECTIONS: IntersectionData[] = [
  {
    intersection_id: "INT_01",
    name: "Main St & 1st Ave",
    vehicle_count: 32,
    traffic_level: "HIGH",
    signal_time: 60,
    timestamp: new Date().toISOString(),
    lat: 28.6139,
    lng: 77.209,
    cars: 18,
    bikes: 6,
    buses: 4,
    trucks: 4,
  },
  {
    intersection_id: "INT_02",
    name: "Park Rd & Oak Blvd",
    vehicle_count: 15,
    traffic_level: "MEDIUM",
    signal_time: 40,
    timestamp: new Date().toISOString(),
    lat: 28.6229,
    lng: 77.219,
    cars: 8,
    bikes: 4,
    buses: 2,
    trucks: 1,
  },
  {
    intersection_id: "INT_03",
    name: "Highway 4 Junction",
    vehicle_count: 7,
    traffic_level: "LOW",
    signal_time: 20,
    timestamp: new Date().toISOString(),
    lat: 28.6059,
    lng: 77.199,
    cars: 4,
    bikes: 2,
    buses: 1,
    trucks: 0,
  },
  {
    intersection_id: "INT_04",
    name: "University Crossing",
    vehicle_count: 22,
    traffic_level: "MEDIUM",
    signal_time: 40,
    timestamp: new Date().toISOString(),
    lat: 28.6189,
    lng: 77.229,
    cars: 12,
    bikes: 5,
    buses: 3,
    trucks: 2,
  },
];

export function generateRandomUpdate(intersection: IntersectionData): IntersectionData {
  const cars = Math.max(0, intersection.cars + Math.floor(Math.random() * 7) - 3);
  const bikes = Math.max(0, intersection.bikes + Math.floor(Math.random() * 5) - 2);
  const buses = Math.max(0, intersection.buses + Math.floor(Math.random() * 3) - 1);
  const trucks = Math.max(0, intersection.trucks + Math.floor(Math.random() * 3) - 1);
  const vehicle_count = cars + bikes + buses + trucks;
  return {
    ...intersection,
    cars,
    bikes,
    buses,
    trucks,
    vehicle_count,
    traffic_level: getTrafficLevel(vehicle_count),
    signal_time: getSignalTime(vehicle_count),
    timestamp: new Date().toISOString(),
  };
}
