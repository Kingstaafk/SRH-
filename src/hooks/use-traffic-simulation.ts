import { useState, useEffect, useCallback } from "react";
import {
  IntersectionData,
  INTERSECTIONS,
  DELHI_INTERSECTIONS,
  LUCKNOW_INTERSECTIONS,
  generateRandomUpdate,
} from "@/lib/traffic-data";
import { fetchOnlineTrafficIntersections, ONLINE_DATASET_NAME } from "@/lib/online-traffic-dataset";

export type TrafficDatasetSource = "online" | "local" | "delhi" | "lucknow";
const DATASET_SOURCE_KEY = "traffic.dataset.source";

export function useTrafficSimulation(intervalMs = 3000) {
  const getInitialPreferredSource = (): TrafficDatasetSource => {
    if (typeof window === "undefined") {
      return "delhi";
    }
    const saved = window.localStorage.getItem(DATASET_SOURCE_KEY);
    return saved === "local" || saved === "online" || saved === "delhi" || saved === "lucknow" ? saved : "delhi";
  };

  const [intersections, setIntersections] = useState<IntersectionData[]>(DELHI_INTERSECTIONS);
  const [isDatasetLoading, setIsDatasetLoading] = useState(true);
  const [datasetSource, setDatasetSource] = useState<TrafficDatasetSource>("delhi");
  const [preferredDatasetSource, setPreferredDatasetSource] = useState<TrafficDatasetSource>(getInitialPreferredSource);
  const [datasetError, setDatasetError] = useState<string | null>(null);

  const refreshDataset = useCallback(
    async (source: TrafficDatasetSource = preferredDatasetSource) => {
      try {
        setIsDatasetLoading(true);
        setDatasetError(null);

        if (source === "delhi") {
          setIntersections(DELHI_INTERSECTIONS.map(generateRandomUpdate));
          setDatasetSource("delhi");
          return;
        }

        if (source === "lucknow") {
          setIntersections(LUCKNOW_INTERSECTIONS.map(generateRandomUpdate));
          setDatasetSource("lucknow");
          return;
        }

        if (source === "local") {
          setIntersections(INTERSECTIONS.map(generateRandomUpdate));
          setDatasetSource("local");
          return;
        }

        const onlineIntersections = await fetchOnlineTrafficIntersections();

        if (onlineIntersections.length > 0) {
          setIntersections(onlineIntersections);
          setDatasetSource("online");
        } else {
          setIntersections(DELHI_INTERSECTIONS.map(generateRandomUpdate));
          setDatasetSource("delhi");
          setDatasetError("Online dataset returned no intersections.");
        }
      } catch (error) {
        setIntersections(DELHI_INTERSECTIONS.map(generateRandomUpdate));
        setDatasetSource("delhi");
        setDatasetError(error instanceof Error ? error.message : "Failed to load online dataset.");
      } finally {
        setIsDatasetLoading(false);
      }
    },
    [preferredDatasetSource],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DATASET_SOURCE_KEY, preferredDatasetSource);
    }
    refreshDataset(preferredDatasetSource);
  }, [preferredDatasetSource, refreshDataset]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIntersections((prev) => prev.map(generateRandomUpdate));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  const totalVehicles = intersections.reduce((s, i) => s + i.vehicle_count, 0);

  const overallLevel = totalVehicles > 80 ? "HIGH" : totalVehicles > 40 ? "MEDIUM" : "LOW";

  return {
    intersections,
    totalVehicles,
    overallLevel,
    isDatasetLoading,
    datasetSource,
    preferredDatasetSource,
    setPreferredDatasetSource,
    datasetName: ONLINE_DATASET_NAME,
    datasetError,
    refreshDataset,
  };
}
