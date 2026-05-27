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

export const DELHI_INTERSECTIONS: IntersectionData[] = [
  {
    intersection_id: "DEL_01",
    name: "ITO Crossing (IP Marg & Vikas Marg)",
    vehicle_count: 58,
    traffic_level: "HIGH",
    signal_time: 60,
    timestamp: new Date().toISOString(),
    lat: 28.6271,
    lng: 77.2435,
    cars: 32,
    bikes: 14,
    buses: 8,
    trucks: 4,
  },
  {
    intersection_id: "DEL_02",
    name: "Connaught Place Outer Circle",
    vehicle_count: 42,
    traffic_level: "HIGH",
    signal_time: 60,
    timestamp: new Date().toISOString(),
    lat: 28.6304,
    lng: 77.2177,
    cars: 25,
    bikes: 12,
    buses: 3,
    trucks: 2,
  },
  {
    intersection_id: "DEL_03",
    name: "AIIMS Crossing (Ring Road & Aurobindo Marg)",
    vehicle_count: 51,
    traffic_level: "HIGH",
    signal_time: 60,
    timestamp: new Date().toISOString(),
    lat: 28.5684,
    lng: 77.2120,
    cars: 28,
    bikes: 12,
    buses: 6,
    trucks: 5,
  },
  {
    intersection_id: "DEL_04",
    name: "Dhaula Kuan Intersection (NH48 & Ring Road)",
    vehicle_count: 36,
    traffic_level: "MEDIUM",
    signal_time: 40,
    timestamp: new Date().toISOString(),
    lat: 28.5918,
    lng: 77.1616,
    cars: 22,
    bikes: 8,
    buses: 4,
    trucks: 2,
  },
  {
    intersection_id: "DEL_05",
    name: "India Gate Circle (Rajpath)",
    vehicle_count: 24,
    traffic_level: "MEDIUM",
    signal_time: 40,
    timestamp: new Date().toISOString(),
    lat: 28.6129,
    lng: 77.2295,
    cars: 15,
    bikes: 6,
    buses: 2,
    trucks: 1,
  }
];

export const LUCKNOW_INTERSECTIONS: IntersectionData[] = [
  {
    intersection_id: "LKO_01",
    name: "Hazratganj Chauraha (Atal Chowk)",
    vehicle_count: 46,
    traffic_level: "HIGH",
    signal_time: 60,
    timestamp: new Date().toISOString(),
    lat: 26.8516,
    lng: 80.9423,
    cars: 20,
    bikes: 20,
    buses: 4,
    trucks: 2,
  },
  {
    intersection_id: "LKO_02",
    name: "Charbagh Crossing (Station Road)",
    vehicle_count: 52,
    traffic_level: "HIGH",
    signal_time: 60,
    timestamp: new Date().toISOString(),
    lat: 26.8322,
    lng: 80.9234,
    cars: 18,
    bikes: 24,
    buses: 8,
    trucks: 2,
  },
  {
    intersection_id: "LKO_03",
    name: "Polytechnic Chauraha (NH28)",
    vehicle_count: 48,
    traffic_level: "HIGH",
    signal_time: 60,
    timestamp: new Date().toISOString(),
    lat: 26.8687,
    lng: 81.0028,
    cars: 16,
    bikes: 20,
    buses: 6,
    trucks: 6,
  },
  {
    intersection_id: "LKO_04",
    name: "Munshi Pulia Crossing",
    vehicle_count: 31,
    traffic_level: "MEDIUM",
    signal_time: 40,
    timestamp: new Date().toISOString(),
    lat: 26.8872,
    lng: 80.9912,
    cars: 12,
    bikes: 14,
    buses: 3,
    trucks: 2,
  },
  {
    intersection_id: "LKO_05",
    name: "1090 Chauraha (Gomti Nagar)",
    vehicle_count: 22,
    traffic_level: "MEDIUM",
    signal_time: 40,
    timestamp: new Date().toISOString(),
    lat: 26.8540,
    lng: 80.9702,
    cars: 10,
    bikes: 10,
    buses: 2,
    trucks: 0,
  }
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
