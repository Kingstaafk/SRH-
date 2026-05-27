import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useTrafficSimulation } from "@/hooks/use-traffic-simulation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";

const LEVEL_COLORS: Record<string, string> = {
  LOW: "#2eaa57",
  MEDIUM: "#eab308",
  HIGH: "#e53e3e",
};

export default function TrafficMap() {
  const {
    intersections,
    datasetSource,
    preferredDatasetSource,
    setPreferredDatasetSource,
    datasetName,
    isDatasetLoading,
    refreshDataset,
  } = useTrafficSimulation();
  const mapCenter: [number, number] =
    intersections.length > 0
      ? [
        intersections.reduce((sum, item) => sum + item.lat, 0) / intersections.length,
        intersections.reduce((sum, item) => sum + item.lng, 0) / intersections.length,
      ]
      : [28.6139, 77.209];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Live Traffic Map</h2>
        <p className="text-sm text-muted-foreground">Intersection status on OpenStreetMap</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={preferredDatasetSource}
            onChange={(event) => setPreferredDatasetSource(event.target.value as "online" | "local" | "delhi" | "lucknow")}
            className="rounded-md border bg-background px-3 py-2 text-xs"
          >
            <option value="delhi">🇮🇳 Live Delhi Simulation</option>
            <option value="lucknow">🇮🇳 Live Lucknow Simulation</option>
            <option value="online">🇬🇧 Online dataset (London DfT)</option>
            <option value="local">⚙️ Generic Simulation</option>
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDatasetLoading}
            onClick={() => refreshDataset()}
            className="h-8 gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isDatasetLoading ? "animate-spin" : ""}`} />
            Refresh dataset
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Source:{" "}
          <span className="font-semibold">
            {datasetSource === "online" ? datasetName :
             datasetSource === "delhi" ? "🇮🇳 Delhi Live Simulation Points" :
             datasetSource === "lucknow" ? "🇮🇳 Lucknow Live Simulation Points" :
             "Generic simulation points"}
          </span>
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border shadow-sm" style={{ height: "65vh" }}>
        <MapContainer
          center={mapCenter}
          zoom={14}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {intersections.map((i) => (
            <CircleMarker
              key={i.intersection_id}
              center={[i.lat, i.lng]}
              radius={18}
              pathOptions={{
                color: LEVEL_COLORS[i.traffic_level],
                fillColor: LEVEL_COLORS[i.traffic_level],
                fillOpacity: 0.5,
                weight: 3,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">{i.name}</p>
                  <p>Vehicles: <strong>{i.vehicle_count}</strong></p>
                  <p>Level: <strong>{i.traffic_level}</strong></p>
                  <p>Signal: <strong>{i.signal_time}s</strong></p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-traffic-green" /> Low (0-10)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-traffic-yellow" /> Medium (10-25)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-traffic-red" /> High (25+)</span>
      </div>
    </div>
  );
}
