import { IntersectionData, getSignalTime, getTrafficLevel } from "@/lib/traffic-data";

const LONDON_DFT_DATASET_URL =
  "https://raw.githubusercontent.com/oobrien/gsac/main/london_traffic_counts/london_dft_traffic_count_locations.json";

type LondonDatasetFeature = {
  properties?: {
    cp?: number;
    la_name?: string;
    road?: string;
    rcat?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

type LondonDatasetResponse = {
  features?: LondonDatasetFeature[];
};

export const ONLINE_DATASET_NAME = "London DfT Traffic Count Locations";
export const ONLINE_DATASET_URL = LONDON_DFT_DATASET_URL;

function toIntersection(feature: LondonDatasetFeature): IntersectionData | null {
  const cp = feature.properties?.cp;
  const road = feature.properties?.road;
  const city = feature.properties?.la_name;
  const coords = feature.geometry?.coordinates;

  if (typeof cp !== "number" || !road || !city || !coords || coords.length < 2) {
    return null;
  }

  const [lng, lat] = coords;
  const base = 10 + (cp % 24) + (feature.properties?.rcat === "TM" ? 12 : 0);
  const cars = Math.max(1, Math.round(base * 0.55));
  const bikes = Math.max(0, Math.round(base * 0.2));
  const buses = Math.max(0, Math.round(base * 0.13));
  const trucks = Math.max(0, base - cars - bikes - buses);
  const vehicle_count = cars + bikes + buses + trucks;

  return {
    intersection_id: `LDN_${cp}`,
    name: `${road} - ${city}`,
    vehicle_count,
    traffic_level: getTrafficLevel(vehicle_count),
    signal_time: getSignalTime(vehicle_count),
    timestamp: new Date().toISOString(),
    lat,
    lng,
    cars,
    bikes,
    buses,
    trucks,
  };
}

export async function fetchOnlineTrafficIntersections(limit = 12): Promise<IntersectionData[]> {
  const response = await fetch(LONDON_DFT_DATASET_URL);
  if (!response.ok) {
    throw new Error(`Dataset request failed: ${response.status}`);
  }

  const payload = (await response.json()) as LondonDatasetResponse;
  const features = payload.features ?? [];

  return features
    .map(toIntersection)
    .filter((value): value is IntersectionData => value !== null)
    .slice(0, limit);
}
