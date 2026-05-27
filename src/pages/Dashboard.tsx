import { Car, Bike, Bus, Truck, Activity, Timer, Radio, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useTrafficSimulation } from "@/hooks/use-traffic-simulation";
import { IntersectionData } from "@/lib/traffic-data";
import { Button } from "@/components/ui/button";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="mt-1 text-2xl font-bold font-mono">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

function LevelBadge({ level }: { level: string }) {
  const cls =
    level === "HIGH"
      ? "bg-traffic-red/10 text-traffic-red"
      : level === "MEDIUM"
        ? "bg-traffic-yellow/10 text-traffic-yellow"
        : "bg-traffic-green/10 text-traffic-green";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{level}</span>;
}

function IntersectionRow({ data }: { data: IntersectionData }) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/50 transition-colors">
      <td className="py-3 px-4 font-mono text-sm">{data.intersection_id}</td>
      <td className="py-3 px-4 text-sm font-medium">{data.name}</td>
      <td className="py-3 px-4 font-mono text-sm text-center">{data.vehicle_count}</td>
      <td className="py-3 px-4 text-center"><LevelBadge level={data.traffic_level} /></td>
      <td className="py-3 px-4 font-mono text-sm text-center">{data.signal_time}s</td>
      <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(data.timestamp).toLocaleTimeString()}</td>
    </tr>
  );
}

export default function Dashboard() {
  const {
    intersections,
    totalVehicles,
    overallLevel,
    isDatasetLoading,
    datasetSource,
    preferredDatasetSource,
    setPreferredDatasetSource,
    datasetName,
    datasetError,
    refreshDataset,
  } = useTrafficSimulation();

  const totalCars = intersections.reduce((s, i) => s + i.cars, 0);
  const totalBikes = intersections.reduce((s, i) => s + i.bikes, 0);
  const totalBuses = intersections.reduce((s, i) => s + i.buses, 0);
  const totalTrucks = intersections.reduce((s, i) => s + i.trucks, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Traffic Dashboard</h2>
        <p className="text-sm text-muted-foreground">Real-time AI-powered traffic monitoring</p>
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
        <p className="mt-1 text-xs text-muted-foreground">
          Dataset:{" "}
          <span className="font-semibold">
            {isDatasetLoading ? "Loading..." : 
             datasetSource === "online" ? datasetName : 
             datasetSource === "delhi" ? "🇮🇳 Delhi Live Simulation" :
             datasetSource === "lucknow" ? "🇮🇳 Lucknow Live Simulation" :
             "Generic simulation"}
          </span>
          {datasetError ? ` (${datasetError})` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Vehicles" value={totalVehicles} icon={Activity} color="bg-primary/10 text-primary" />
        <StatCard label="Traffic Level" value={overallLevel} icon={Radio} color={
          overallLevel === "HIGH" ? "bg-traffic-red/10 text-traffic-red" :
            overallLevel === "MEDIUM" ? "bg-traffic-yellow/10 text-traffic-yellow" :
              "bg-traffic-green/10 text-traffic-green"
        } />
        <StatCard label="Active Intersections" value={intersections.length} icon={Timer} color="bg-accent/10 text-accent" />
        <StatCard label="Avg Signal Time" value={`${Math.round(intersections.reduce((s, i) => s + i.signal_time, 0) / intersections.length)}s`} icon={Timer} color="bg-secondary text-secondary-foreground" />
      </div>

      {/* Vehicle breakdown */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <Car className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Cars</p>
            <p className="font-mono font-bold">{totalCars}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <Bike className="h-5 w-5 text-accent" />
          <div>
            <p className="text-xs text-muted-foreground">Motorbikes</p>
            <p className="font-mono font-bold">{totalBikes}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <Bus className="h-5 w-5 text-traffic-yellow" />
          <div>
            <p className="text-xs text-muted-foreground">Buses</p>
            <p className="font-mono font-bold">{totalBuses}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <Truck className="h-5 w-5 text-traffic-red" />
          <div>
            <p className="text-xs text-muted-foreground">Trucks</p>
            <p className="font-mono font-bold">{totalTrucks}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">ID</th>
              <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Name</th>
              <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase text-center">Vehicles</th>
              <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase text-center">Level</th>
              <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase text-center">Signal</th>
              <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Updated</th>
            </tr>
          </thead>
          <tbody>
            {intersections.map((d) => (
              <IntersectionRow key={d.intersection_id} data={d} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
