import { useEffect, useRef, useState, useCallback } from "react";
import { SignalState } from "@/lib/traffic-data";

type Vehicle = {
  id: number;
  x: number;
  y: number;
  lane: "north" | "south" | "east" | "west";
  type: "car" | "bus" | "truck" | "bike";
  speed: number;
  color: string;
  width: number;
  height: number;
  waiting: boolean;
};

const VEHICLE_COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
  "#1abc9c", "#e67e22", "#ecf0f1", "#95a5a6", "#34495e",
  "#d35400", "#c0392b", "#2980b9", "#27ae60", "#f1c40f",
];

const VEHICLE_TYPES: { type: Vehicle["type"]; w: number; h: number; chance: number }[] = [
  { type: "car", w: 18, h: 30, chance: 0.55 },
  { type: "bike", w: 10, h: 22, chance: 0.2 },
  { type: "bus", w: 22, h: 50, chance: 0.15 },
  { type: "truck", w: 22, h: 44, chance: 0.1 },
];

function pickVehicleType() {
  const r = Math.random();
  let acc = 0;
  for (const v of VEHICLE_TYPES) {
    acc += v.chance;
    if (r < acc) return v;
  }
  return VEHICLE_TYPES[0];
}

interface TrafficCameraCanvasProps {
  getSignalState: (dir: string) => SignalState;
  onVehicleCount?: (counts: { cars: number; bikes: number; buses: number; trucks: number }) => void;
}

export default function TrafficCameraCanvas({ getSignalState, onVehicleCount }: TrafficCameraCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vehiclesRef = useRef<Vehicle[]>([]);
  const nextIdRef = useRef(0);
  const frameRef = useRef(0);

  const W = 640;
  const H = 480;

  // Road geometry
  const ROAD_W = 90;
  const cx = W / 2;
  const cy = H / 2;
  const roadLeft = cx - ROAD_W / 2;
  const roadRight = cx + ROAD_W / 2;
  const roadTop = cy - ROAD_W / 2;
  const roadBottom = cy + ROAD_W / 2;

  // Lane offsets (2 lanes per direction)
  const laneOffset = ROAD_W / 4;

  // Stop lines
  const stopMargin = 8;

  const spawnVehicle = useCallback((lane: Vehicle["lane"]) => {
    const vt = pickVehicleType();
    const color = VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)];
    const speed = 1.2 + Math.random() * 1.0;

    let x = 0, y = 0, w = vt.w, h = vt.h;

    // Swap w/h for horizontal lanes
    if (lane === "east" || lane === "west") {
      [w, h] = [h, w];
    }

    switch (lane) {
      case "north": // coming from top, going down (right lane = cx + laneOffset/2)
        x = cx + laneOffset / 2 - w / 2 + (Math.random() - 0.5) * 4;
        y = -h - Math.random() * 60;
        break;
      case "south": // coming from bottom, going up (left lane = cx - laneOffset/2)
        x = cx - laneOffset / 2 - w / 2 + (Math.random() - 0.5) * 4;
        y = H + Math.random() * 60;
        break;
      case "east": // coming from right, going left
        x = W + Math.random() * 60;
        y = cy + laneOffset / 2 - h / 2 + (Math.random() - 0.5) * 4;
        break;
      case "west": // coming from left, going right
        x = -w - Math.random() * 60;
        y = cy - laneOffset / 2 - h / 2 + (Math.random() - 0.5) * 4;
        break;
    }

    vehiclesRef.current.push({
      id: nextIdRef.current++,
      x, y, lane,
      type: vt.type,
      speed,
      color,
      width: w,
      height: h,
      waiting: false,
    });
  }, [cx, cy, laneOffset, H, W]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;

    const draw = () => {
      frameRef.current++;
      const frame = frameRef.current;

      // Spawn vehicles periodically
      if (frame % 45 === 0) {
        const lanes: Vehicle["lane"][] = ["north", "south", "east", "west"];
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        // Don't overpopulate
        const countInLane = vehiclesRef.current.filter(v => v.lane === lane).length;
        if (countInLane < 8) spawnVehicle(lane);
      }
      // Extra spawn for busier feel
      if (frame % 70 === 35) {
        const lanes: Vehicle["lane"][] = ["north", "south", "east", "west"];
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        const countInLane = vehiclesRef.current.filter(v => v.lane === lane).length;
        if (countInLane < 6) spawnVehicle(lane);
      }

      // --- Draw scene ---
      // Sky / background (dark like a camera feed)
      ctx.fillStyle = "#1a1f2e";
      ctx.fillRect(0, 0, W, H);

      // Grass areas
      ctx.fillStyle = "#1e3a1e";
      ctx.fillRect(0, 0, roadLeft, roadTop);
      ctx.fillRect(roadRight, 0, W - roadRight, roadTop);
      ctx.fillRect(0, roadBottom, roadLeft, H - roadBottom);
      ctx.fillRect(roadRight, roadBottom, W - roadRight, H - roadBottom);

      // Roads
      ctx.fillStyle = "#2d3340";
      // Vertical road
      ctx.fillRect(roadLeft, 0, ROAD_W, H);
      // Horizontal road
      ctx.fillRect(0, roadTop, W, ROAD_W);
      // Intersection
      ctx.fillStyle = "#333a4a";
      ctx.fillRect(roadLeft, roadTop, ROAD_W, ROAD_W);

      // Lane markings (dashed center lines)
      ctx.setLineDash([12, 10]);
      ctx.strokeStyle = "#f1c40f88";
      ctx.lineWidth = 2;

      // Vertical center line
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, roadTop - 2);
      ctx.moveTo(cx, roadBottom + 2);
      ctx.lineTo(cx, H);
      ctx.stroke();

      // Horizontal center line
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(roadLeft - 2, cy);
      ctx.moveTo(roadRight + 2, cy);
      ctx.lineTo(W, cy);
      ctx.stroke();

      ctx.setLineDash([]);

      // Stop lines
      ctx.strokeStyle = "#ffffff99";
      ctx.lineWidth = 3;
      // North approach stop line
      ctx.beginPath(); ctx.moveTo(cx, roadTop - stopMargin); ctx.lineTo(roadRight - 4, roadTop - stopMargin); ctx.stroke();
      // South approach stop line
      ctx.beginPath(); ctx.moveTo(roadLeft + 4, roadBottom + stopMargin); ctx.lineTo(cx, roadBottom + stopMargin); ctx.stroke();
      // West approach stop line
      ctx.beginPath(); ctx.moveTo(roadLeft - stopMargin, cy); ctx.lineTo(roadLeft - stopMargin, roadBottom - 4); ctx.stroke();
      // East approach stop line
      ctx.beginPath(); ctx.moveTo(roadRight + stopMargin, roadTop + 4); ctx.lineTo(roadRight + stopMargin, cy); ctx.stroke();

      // Crosswalk stripes
      ctx.fillStyle = "#ffffff22";
      for (let i = 0; i < 5; i++) {
        // Top crosswalk
        ctx.fillRect(roadLeft + 4 + i * 18, roadTop - 18, 10, 14);
        // Bottom crosswalk
        ctx.fillRect(roadLeft + 4 + i * 18, roadBottom + 4, 10, 14);
        // Left crosswalk
        ctx.fillRect(roadLeft - 18, roadTop + 4 + i * 18, 14, 10);
        // Right crosswalk
        ctx.fillRect(roadRight + 4, roadTop + 4 + i * 18, 14, 10);
      }

      // Traffic light indicators on the intersection corners
      const drawSignalDot = (x: number, y: number, state: SignalState) => {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle =
          state === "GREEN" ? "#2ecc71" :
          state === "YELLOW" ? "#f1c40f" : "#e74c3c";
        ctx.fill();
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      };

      const nsState = getSignalState("north");
      const ewState = getSignalState("east");
      drawSignalDot(roadRight + 16, roadTop - 16, nsState);
      drawSignalDot(roadLeft - 16, roadBottom + 16, nsState);
      drawSignalDot(roadRight + 16, roadBottom + 16, ewState);
      drawSignalDot(roadLeft - 16, roadTop - 16, ewState);

      // --- Update & draw vehicles ---
      const vehicles = vehiclesRef.current;
      const counts = { cars: 0, bikes: 0, buses: 0, trucks: 0 };

      for (const v of vehicles) {
        // Check if should stop at red/yellow light
        const signal = (v.lane === "north" || v.lane === "south") ? nsState : ewState;
        const shouldStop = signal === "RED" || signal === "YELLOW";

        let atStopLine = false;
        if (shouldStop) {
          switch (v.lane) {
            case "north":
              atStopLine = v.y + v.height >= roadTop - stopMargin - 4 && v.y + v.height < roadTop + 10;
              break;
            case "south":
              atStopLine = v.y <= roadBottom + stopMargin + 4 && v.y > roadBottom - 10;
              break;
            case "east":
              atStopLine = v.x <= roadRight + stopMargin + 4 && v.x > roadRight - 10;
              break;
            case "west":
              atStopLine = v.x + v.width >= roadLeft - stopMargin - 4 && v.x + v.width < roadLeft + 10;
              break;
          }
        }

        // Check if blocked by vehicle ahead
        let blocked = false;
        for (const other of vehicles) {
          if (other.id === v.id || other.lane !== v.lane) continue;
          const gap = 6;
          switch (v.lane) {
            case "north":
              if (other.y > v.y && other.y - (v.y + v.height) < gap && other.y - (v.y + v.height) > -4) blocked = true;
              break;
            case "south":
              if (other.y < v.y && (v.y - (other.y + other.height)) < gap && (v.y - (other.y + other.height)) > -4) blocked = true;
              break;
            case "east":
              if (other.x < v.x && (v.x - (other.x + other.width)) < gap && (v.x - (other.x + other.width)) > -4) blocked = true;
              break;
            case "west":
              if (other.x > v.x && (other.x - (v.x + v.width)) < gap && (other.x - (v.x + v.width)) > -4) blocked = true;
              break;
          }
        }

        v.waiting = (shouldStop && atStopLine) || blocked;

        if (!v.waiting) {
          switch (v.lane) {
            case "north": v.y += v.speed; break;
            case "south": v.y -= v.speed; break;
            case "east": v.x -= v.speed; break;
            case "west": v.x += v.speed; break;
          }
        }

        // Count vehicles in view
        if (v.x > -50 && v.x < W + 50 && v.y > -50 && v.y < H + 50) {
          if (v.type === "car") counts.cars++;
          else if (v.type === "bike") counts.bikes++;
          else if (v.type === "bus") counts.buses++;
          else if (v.type === "truck") counts.trucks++;
        }

        // Draw vehicle
        ctx.save();
        // Shadow under vehicle
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(v.x + 2, v.y + 2, v.width, v.height);

        // Body
        ctx.fillStyle = v.color;
        const radius = 3;
        ctx.beginPath();
        ctx.moveTo(v.x + radius, v.y);
        ctx.lineTo(v.x + v.width - radius, v.y);
        ctx.quadraticCurveTo(v.x + v.width, v.y, v.x + v.width, v.y + radius);
        ctx.lineTo(v.x + v.width, v.y + v.height - radius);
        ctx.quadraticCurveTo(v.x + v.width, v.y + v.height, v.x + v.width - radius, v.y + v.height);
        ctx.lineTo(v.x + radius, v.y + v.height);
        ctx.quadraticCurveTo(v.x, v.y + v.height, v.x, v.y + v.height - radius);
        ctx.lineTo(v.x, v.y + radius);
        ctx.quadraticCurveTo(v.x, v.y, v.x + radius, v.y);
        ctx.fill();

        // Windshield
        ctx.fillStyle = "rgba(150,200,255,0.4)";
        if (v.lane === "north" || v.lane === "south") {
          const wy = v.lane === "north" ? v.y + 4 : v.y + v.height - 10;
          ctx.fillRect(v.x + 3, wy, v.width - 6, 6);
        } else {
          const wx = v.lane === "west" ? v.x + v.width - 10 : v.x + 4;
          ctx.fillRect(wx, v.y + 3, 6, v.height - 6);
        }

        // Headlights (small dots)
        ctx.fillStyle = "#ffffffcc";
        if (v.type !== "bike") {
          if (v.lane === "north") {
            ctx.fillRect(v.x + 2, v.y + v.height - 3, 3, 2);
            ctx.fillRect(v.x + v.width - 5, v.y + v.height - 3, 3, 2);
          } else if (v.lane === "south") {
            ctx.fillRect(v.x + 2, v.y + 1, 3, 2);
            ctx.fillRect(v.x + v.width - 5, v.y + 1, 3, 2);
          } else if (v.lane === "west") {
            ctx.fillRect(v.x + v.width - 3, v.y + 2, 2, 3);
            ctx.fillRect(v.x + v.width - 3, v.y + v.height - 5, 2, 3);
          } else {
            ctx.fillRect(v.x + 1, v.y + 2, 2, 3);
            ctx.fillRect(v.x + 1, v.y + v.height - 5, 2, 3);
          }
        }

        // Brake lights when waiting
        if (v.waiting) {
          ctx.fillStyle = "#ff0000cc";
          if (v.lane === "north") {
            ctx.fillRect(v.x + 2, v.y + 1, 3, 2);
            ctx.fillRect(v.x + v.width - 5, v.y + 1, 3, 2);
          } else if (v.lane === "south") {
            ctx.fillRect(v.x + 2, v.y + v.height - 3, 3, 2);
            ctx.fillRect(v.x + v.width - 5, v.y + v.height - 3, 3, 2);
          } else if (v.lane === "west") {
            ctx.fillRect(v.x + 1, v.y + 2, 2, 3);
            ctx.fillRect(v.x + 1, v.y + v.height - 5, 2, 3);
          } else {
            ctx.fillRect(v.x + v.width - 3, v.y + 2, 2, 3);
            ctx.fillRect(v.x + v.width - 3, v.y + v.height - 5, 2, 3);
          }
        }
        ctx.restore();
      }

      // Remove off-screen vehicles
      vehiclesRef.current = vehicles.filter((v) => {
        switch (v.lane) {
          case "north": return v.y < H + 80;
          case "south": return v.y > -80;
          case "east": return v.x > -80;
          case "west": return v.x < W + 80;
        }
        return true;
      });

      // Report counts
      if (frame % 30 === 0 && onVehicleCount) {
        onVehicleCount(counts);
      }

      // Camera overlay — timestamp, REC indicator, crosshair
      // Scanline effect
      ctx.fillStyle = "rgba(0,0,0,0.03)";
      for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
      }

      // Vignette
      const vignette = ctx.createRadialGradient(cx, cy, W * 0.3, cx, cy, W * 0.75);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      // HUD overlay
      ctx.fillStyle = "#ffffffcc";
      ctx.font = "bold 11px monospace";

      // REC indicator
      if (Math.floor(frame / 30) % 2 === 0) {
        ctx.fillStyle = "#e74c3c";
        ctx.beginPath();
        ctx.arc(24, 20, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffffffcc";
      ctx.fillText("● REC", 34, 24);

      // Camera ID
      ctx.fillText("CAM-01  INT_01", W - 150, 24);

      // Timestamp
      const now = new Date();
      const ts = now.toLocaleTimeString("en-US", { hour12: false }) + "." + String(now.getMilliseconds()).padStart(3, "0");
      ctx.fillText(ts, 16, H - 14);
      ctx.fillText(`${now.toLocaleDateString("en-US")}`, 16, H - 28);

      // Vehicle count overlay
      const total = counts.cars + counts.bikes + counts.buses + counts.trucks;
      ctx.fillText(`VEH: ${total}`, W - 80, H - 28);
      ctx.fillStyle = total > 25 ? "#e74c3c" : total > 10 ? "#f1c40f" : "#2ecc71";
      ctx.fillText(total > 25 ? "HIGH" : total > 10 ? "MED" : "LOW", W - 80, H - 14);

      // Crosshair at center
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy); ctx.lineTo(cx + 15, cy);
      ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy + 15);
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [getSignalState, onVehicleCount, spawnVehicle, cx, cy, roadLeft, roadRight, roadTop, roadBottom, ROAD_W, laneOffset, stopMargin, W, H]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="w-full rounded-lg"
      style={{ imageRendering: "auto", maxHeight: 480 }}
    />
  );
}
