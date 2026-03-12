import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useTrafficSimulation } from "@/hooks/use-traffic-simulation";
import "leaflet/dist/leaflet.css";

const LEVEL_COLORS: Record<string, string> = {
  LOW: "#2eaa57",
  MEDIUM: "#eab308",
  HIGH: "#e53e3e",
};

export default function TrafficMap() {
  const { intersections } = useTrafficSimulation();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Live Traffic Map</h2>
        <p className="text-sm text-muted-foreground">Intersection status on OpenStreetMap</p>
      </div>
      <div className="overflow-hidden rounded-xl border shadow-sm" style={{ height: "65vh" }}>
        <MapContainer
          center={[28.6139, 77.209]}
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
