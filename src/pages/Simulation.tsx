import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SignalState } from "@/lib/traffic-data";
import { useTrafficSimulation } from "@/hooks/use-traffic-simulation";

function TrafficLight({ state }: { state: SignalState }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-foreground/90 p-3 shadow-lg">
      <div className={`h-7 w-7 rounded-full transition-all duration-300 ${state === "RED" ? "traffic-light-red" : "traffic-light-off"}`} />
      <div className={`h-7 w-7 rounded-full transition-all duration-300 ${state === "YELLOW" ? "traffic-light-yellow" : "traffic-light-off"}`} />
      <div className={`h-7 w-7 rounded-full transition-all duration-300 ${state === "GREEN" ? "traffic-light-green" : "traffic-light-off"}`} />
    </div>
  );
}

const DIRECTIONS = ["north", "east", "south", "west"] as const;
const DIR_LABELS: Record<string, string> = { north: "N", east: "E", south: "S", west: "W" };

// Positions for each direction's light around the intersection
const DIR_POSITIONS: Record<string, string> = {
  north: "top-2 left-1/2 -translate-x-1/2",
  south: "bottom-2 left-1/2 -translate-x-1/2",
  east: "right-2 top-1/2 -translate-y-1/2",
  west: "left-2 top-1/2 -translate-y-1/2",
};

export default function Simulation() {
  const { intersections } = useTrafficSimulation(2000);
  const selected = intersections[0]; // Simulate INT_01

  const [phase, setPhase] = useState(0); // 0=N/S green, 1=N/S yellow, 2=E/W green, 3=E/W yellow
  const [timer, setTimer] = useState(selected.signal_time);

  useEffect(() => {
    const greenTime = selected.signal_time;
    const yellowTime = 3;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setPhase((p) => (p + 1) % 4);
          const nextPhase = (phase + 1) % 4;
          return nextPhase % 2 === 0 ? greenTime : yellowTime;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, selected.signal_time]);

  const getState = (dir: string): SignalState => {
    const isNS = dir === "north" || dir === "south";
    if (phase === 0) return isNS ? "GREEN" : "RED";
    if (phase === 1) return isNS ? "YELLOW" : "RED";
    if (phase === 2) return isNS ? "RED" : "GREEN";
    return isNS ? "RED" : "YELLOW";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Signal Simulation</h2>
        <p className="text-sm text-muted-foreground">4-way intersection — {selected.name}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Intersection visual */}
        <div className="flex items-center justify-center rounded-xl border bg-card p-6 shadow-sm" style={{ minHeight: 420 }}>
          <div className="relative h-80 w-80">
            {/* Roads */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-24 bg-muted-foreground/10 rounded" />
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-24 bg-muted-foreground/10 rounded" />
            {/* Center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-24 bg-muted-foreground/20 rounded" />

            {/* Traffic lights */}
            {DIRECTIONS.map((dir) => (
              <div key={dir} className={`absolute ${DIR_POSITIONS[dir]} flex flex-col items-center gap-1`}>
                <span className="text-[10px] font-bold text-muted-foreground">{DIR_LABELS[dir]}</span>
                <TrafficLight state={getState(dir)} />
              </div>
            ))}
          </div>
        </div>

        {/* Control panel */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Signal Status</h3>
            <div className="text-center">
              <motion.p
                key={timer}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-5xl font-bold font-mono"
              >
                {timer}
              </motion.p>
              <p className="text-xs text-muted-foreground mt-1">seconds remaining</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DIRECTIONS.map((dir) => {
                const state = getState(dir);
                const cls =
                  state === "GREEN" ? "bg-traffic-green/10 text-traffic-green border-traffic-green/30" :
                  state === "YELLOW" ? "bg-traffic-yellow/10 text-traffic-yellow border-traffic-yellow/30" :
                  "bg-traffic-red/10 text-traffic-red border-traffic-red/30";
                return (
                  <div key={dir} className={`rounded-lg border p-3 text-center ${cls}`}>
                    <p className="text-xs font-semibold uppercase">{dir}</p>
                    <p className="text-lg font-bold font-mono">{state}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Vehicle Data</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Cars</span><span className="font-mono font-bold">{selected.cars}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Bikes</span><span className="font-mono font-bold">{selected.bikes}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Buses</span><span className="font-mono font-bold">{selected.buses}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Trucks</span><span className="font-mono font-bold">{selected.trucks}</span></div>
            </div>
            <div className="flex justify-between border-t pt-2 text-sm">
              <span className="text-muted-foreground font-medium">Total</span>
              <span className="font-mono font-bold">{selected.vehicle_count}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Density</span>
              <span className={`font-bold ${
                selected.traffic_level === "HIGH" ? "text-traffic-red" :
                selected.traffic_level === "MEDIUM" ? "text-traffic-yellow" :
                "text-traffic-green"
              }`}>{selected.traffic_level}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
