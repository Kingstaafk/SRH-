import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Video, RefreshCw } from "lucide-react";
import { SignalState } from "@/lib/traffic-data";
import { useTrafficSimulation } from "@/hooks/use-traffic-simulation";
import TrafficCameraCanvas from "@/components/TrafficCameraCanvas";
import LiveTrafficCameras from "@/components/LiveTrafficCameras";
import { Button } from "@/components/ui/button";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

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

const DIR_POSITIONS: Record<string, string> = {
  north: "top-2 left-1/2 -translate-x-1/2",
  south: "bottom-2 left-1/2 -translate-x-1/2",
  east: "right-2 top-1/2 -translate-y-1/2",
  west: "left-2 top-1/2 -translate-y-1/2",
};

export default function Simulation() {
  const {
    intersections,
    datasetSource,
    preferredDatasetSource,
    setPreferredDatasetSource,
    datasetName,
    isDatasetLoading,
    refreshDataset,
  } = useTrafficSimulation(2000);
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = intersections.find(i => i.intersection_id === selectedId) || intersections[0];

  const [phase, setPhase] = useState(0);
  const [timer, setTimer] = useState(selected ? selected.signal_time : 40);
  const [camCounts, setCamCounts] = useState({ cars: 0, bikes: 0, buses: 0, trucks: 0 });

  // Live Webcam States
  const [feedMode, setFeedMode] = useState<"simulated" | "webcam">("simulated");
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const webcamRafRef = useRef<number | null>(null);

  const startWebcam = async () => {
    setWebcamError(null);
    try {
      if (!modelReady && !detectorRef.current) {
        setIsModelLoading(true);
        try {
          await tf.ready();
          detectorRef.current = await cocoSsd.load({ base: "mobilenet_v2" });
          setModelReady(true);
        } catch (modelErr) {
          console.error("AI Model load error:", modelErr);
          throw new Error("Internet Connection Required: Live AI detection requires an active internet connection to download the lightweight pre-trained model (COCO-SSD) upon first use. Please check your network and try again.");
        } finally {
          setIsModelLoading(false);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setFeedMode("webcam");
    } catch (err) {
      console.error(err);
      let errorMsg = "Failed to access webcam";
      if (err instanceof Error) {
        errorMsg = err.message;
        if (err.name === "NotAllowedError") {
          errorMsg = "Camera Permission Denied: Please allow camera access in your settings.";
        }
      }
      setWebcamError(errorMsg);
      setFeedMode("simulated");
      setIsModelLoading(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (webcamRafRef.current) {
      cancelAnimationFrame(webcamRafRef.current);
      webcamRafRef.current = null;
    }
    setFeedMode("simulated");
  };

  useEffect(() => {
    let active = true;

    const detectFrame = async () => {
      if (!active || feedMode !== "webcam" || !detectorRef.current || !videoRef.current || !canvasRef.current) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (video.readyState >= 2 && ctx) {
        const detections = await detectorRef.current.detect(video, 30, 0.35);
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const counts = { cars: 0, bikes: 0, buses: 0, trucks: 0 };

        detections.forEach((d) => {
          const [x, y, w, h] = d.bbox;
          let boxColor = "#3b82f6"; // Blue default

          if (d.class === "car") {
            counts.cars++;
            boxColor = "#ef4444"; // Red
          } else if (d.class === "motorcycle" || d.class === "bicycle") {
            counts.bikes++;
            boxColor = "#eab308"; // Yellow
          } else if (d.class === "bus") {
            counts.buses++;
            boxColor = "#10b981"; // Green
          } else if (d.class === "truck") {
            counts.trucks++;
            boxColor = "#a855f7"; // Purple
          } else if (["person", "cell phone", "cup", "chair", "bottle", "hand"].includes(d.class)) {
            // Map common indoor objects to cars/bikes to make it easy to test/interact inside a room!
            counts.cars++; 
            boxColor = "#22c55e"; // Emerald
          }

          // Draw neon glowing box
          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 3;
          ctx.shadowColor = boxColor;
          ctx.shadowBlur = 8;
          ctx.strokeRect(x, y, w, h);
          ctx.shadowBlur = 0; // reset

          // Label background
          ctx.fillStyle = boxColor;
          ctx.font = "bold 12px sans-serif";
          const labelText = `${d.class.toUpperCase()} (${Math.round(d.score * 100)}%)`;
          const textWidth = ctx.measureText(labelText).width;
          ctx.fillRect(x - 1, y - 20, textWidth + 10, 20);

          ctx.fillStyle = "#ffffff";
          ctx.fillText(labelText, x + 4, y - 5);
        });

        setCamCounts(counts);
      }

      if (active && feedMode === "webcam") {
        webcamRafRef.current = requestAnimationFrame(detectFrame);
      }
    };

    if (feedMode === "webcam") {
      detectFrame();
    }

    return () => {
      active = false;
      if (webcamRafRef.current) {
        cancelAnimationFrame(webcamRafRef.current);
      }
    };
  }, [feedMode]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
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
  }, [phase, selected]);

  const getState = useCallback((dir: string): SignalState => {
    const isNS = dir === "north" || dir === "south";
    if (phase === 0) return isNS ? "GREEN" : "RED";
    if (phase === 1) return isNS ? "YELLOW" : "RED";
    if (phase === 2) return isNS ? "RED" : "GREEN";
    return isNS ? "RED" : "YELLOW";
  }, [phase]);

  const displayCounts = feedMode === "webcam" ? camCounts : {
    cars: selected ? selected.cars : 0,
    bikes: selected ? selected.bikes : 0,
    buses: selected ? selected.buses : 0,
    trucks: selected ? selected.trucks : 0
  };

  const totalDetected = displayCounts.cars + displayCounts.bikes + displayCounts.buses + displayCounts.trucks;

  if (!selected) {
    return <div className="text-sm text-muted-foreground">Loading simulation feed...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Signal Simulation</h2>
        <p className="text-sm text-muted-foreground">4-way intersection — {selected.name}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={preferredDatasetSource}
            onChange={(event) => {
              setPreferredDatasetSource(event.target.value as "online" | "local" | "delhi" | "lucknow");
              setSelectedId(""); // reset selected intersection ID on source change
            }}
            className="rounded-md border bg-background px-3 py-2 text-xs"
          >
            <option value="delhi">🇮🇳 Live Delhi Simulation</option>
            <option value="lucknow">🇮🇳 Live Lucknow Simulation</option>
            <option value="online">🇬🇧 Online dataset (London DfT)</option>
            <option value="local">⚙️ Generic Simulation</option>
          </select>

          {intersections.length > 0 && (
            <select
              value={selected.intersection_id}
              onChange={(event) => setSelectedId(event.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-xs font-medium"
            >
              {intersections.map((item) => (
                <option key={item.intersection_id} value={item.intersection_id}>
                  📍 {item.name}
                </option>
              ))}
            </select>
          )}

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

          {feedMode === "simulated" ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isModelLoading}
              onClick={startWebcam}
              className="h-8 gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Camera className="h-3.5 w-3.5" />
              {isModelLoading ? "Loading AI models..." : "Enable Live Webcam Feed"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopWebcam}
              className="h-8 gap-2 text-xs text-white"
            >
              <Camera className="h-3.5 w-3.5" />
              Disable Webcam Feed
            </Button>
          )}
        </div>
        {webcamError && (
          <p className="text-xs text-destructive mt-1">
            Webcam Error: {webcamError}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Detection source:{" "}
          <span className="font-semibold">
            {feedMode === "webcam" ? "🔴 Live Webcam AI Detector" :
             datasetSource === "online" ? datasetName :
             datasetSource === "delhi" ? "🇮🇳 Delhi Live Simulation Data" :
             datasetSource === "lucknow" ? "🇮🇳 Lucknow Live Simulation Data" :
             "Generic simulation data"}
          </span>
        </p>
      </div>

      {/* Simulated Traffic Camera Feed */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-traffic-red" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Traffic Camera — AI Detection Feed</h3>
            <span className="ml-1 flex items-center gap-1 rounded-full bg-traffic-red/15 px-2 py-0.5 text-[10px] font-bold text-traffic-red">
              <span className="h-1.5 w-1.5 rounded-full bg-traffic-red animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Video className="h-3 w-3" /> CAM-01</span>
            <span className="font-mono">{totalDetected} vehicles</span>
          </div>
        </div>

        <div className="bg-black relative aspect-video flex items-center justify-center">
          {feedMode === "simulated" ? (
            <TrafficCameraCanvas 
              getSignalState={getState} 
              selectedIntersection={selected}
              onVehicleCount={setCamCounts} 
            />
          ) : (
            <div className="w-full h-full relative flex items-center justify-center bg-zinc-950 overflow-hidden">
              <video
                ref={videoRef}
                style={{ display: "none" }}
                width={640}
                height={480}
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="w-full rounded-lg"
                style={{ maxHeight: 480 }}
              />
              <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE WEBCAM AI DETECTION
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-px bg-border">
          {(["cars", "bikes", "buses", "trucks"] as const).map((type) => (
            <div key={type} className="bg-card px-4 py-2 text-center">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">{type}</p>
              <p className="text-lg font-bold font-mono">{displayCounts[type]}</p>
            </div>
          ))}
        </div>
      </div>

      <LiveTrafficCameras datasetSource={datasetSource} datasetName={datasetName} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Intersection visual */}
        <div className="flex items-center justify-center rounded-xl border bg-card p-4 sm:p-6 shadow-sm overflow-hidden" style={{ minHeight: 380 }}>
          <div className="relative h-80 w-80 origin-center scale-[0.75] min-[380px]:scale-[0.85] sm:scale-100 transition-transform">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-24 bg-muted-foreground/10 rounded" />
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-24 bg-muted-foreground/10 rounded" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-24 bg-muted-foreground/20 rounded" />
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
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Detection Data</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Cars</span><span className="font-mono font-bold">{displayCounts.cars}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Bikes</span><span className="font-mono font-bold">{displayCounts.bikes}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Buses</span><span className="font-mono font-bold">{displayCounts.buses}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Trucks</span><span className="font-mono font-bold">{displayCounts.trucks}</span></div>
            </div>
            <div className="flex justify-between border-t pt-2 text-sm">
              <span className="text-muted-foreground font-medium">Total</span>
              <span className="font-mono font-bold">{totalDetected}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Density</span>
              <span className={`font-bold ${totalDetected > 25 ? "text-traffic-red" :
                totalDetected > 10 ? "text-traffic-yellow" :
                  "text-traffic-green"
                }`}>{totalDetected > 25 ? "HIGH" : totalDetected > 10 ? "MEDIUM" : "LOW"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
