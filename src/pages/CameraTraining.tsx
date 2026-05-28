import { useEffect, useRef, useState } from "react";
import { Camera, Upload, Brain, Play, Square, Loader2 } from "lucide-react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
import { Button } from "@/components/ui/button";
import { getSignalTime, getTrafficLevel } from "@/lib/traffic-data";


const DIRECTIONS = ["north", "east", "south", "west"] as const;
const DIR_LABELS: Record<string, string> = { north: "N", east: "E", south: "S", west: "W" };

const DIR_POSITIONS: Record<string, string> = {
  north: "top-1 left-1/2 -translate-x-1/2",
  south: "bottom-1 left-1/2 -translate-x-1/2",
  east: "right-1 top-1/2 -translate-y-1/2",
  west: "left-1 top-1/2 -translate-y-1/2",
};

function TrafficLight({ state }: { state: "RED" | "YELLOW" | "GREEN" }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded bg-foreground/90 p-1 shadow-md">
      <div className={`h-3 w-3 rounded-full transition-all duration-300 ${state === "RED" ? "traffic-light-red" : "traffic-light-off"}`} />
      <div className={`h-3 w-3 rounded-full transition-all duration-300 ${state === "YELLOW" ? "traffic-light-yellow" : "traffic-light-off"}`} />
      <div className={`h-3 w-3 rounded-full transition-all duration-300 ${state === "GREEN" ? "traffic-light-green" : "traffic-light-off"}`} />
    </div>
  );
}

type TrafficLabel = "LOW" | "MEDIUM" | "HIGH";

const LABELS: TrafficLabel[] = ["LOW", "MEDIUM", "HIGH"];
const SIGNAL_PHASES = ["NS_GREEN", "NS_YELLOW", "EW_GREEN", "EW_YELLOW"] as const;
type SignalPhase = (typeof SIGNAL_PHASES)[number];

type KaggleDatasetVideo = {
  id: string;
  title: string;
  path: string;
  split?: string;
  suggestedLabel?: TrafficLabel;
};

type KaggleDatasetManifest = {
  name?: string;
  description?: string;
  videos?: KaggleDatasetVideo[];
};

const trafficHints: Record<TrafficLabel, string> = {
  LOW: "Sparse traffic scene",
  MEDIUM: "Moderate traffic scene",
  HIGH: "Dense traffic or congestion",
};

export default function CameraTraining() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const featureExtractorRef = useRef<mobilenet.MobileNet | null>(null);
  const classifierRef = useRef<knnClassifier.KNNClassifier>(knnClassifier.create());
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModelsReady, setIsModelsReady] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [detectionSummary, setDetectionSummary] = useState("No detections yet.");
  const [prediction, setPrediction] = useState<string>("Not trained yet");
  const [vehicleBreakdown, setVehicleBreakdown] = useState({
    cars: 0,
    bikes: 0,
    buses: 0,
    trucks: 0,
  });
  const [simTrafficLevel, setSimTrafficLevel] = useState<TrafficLabel>("LOW");
  const [simSignalTime, setSimSignalTime] = useState(20);
  const [simPhase, setSimPhase] = useState<SignalPhase>("NS_GREEN");
  const [simTimer, setSimTimer] = useState(20);
  const [datasetInfo, setDatasetInfo] = useState<{ name: string; description: string } | null>(null);
  const [datasetVideos, setDatasetVideos] = useState<KaggleDatasetVideo[]>([]);
  const [selectedDatasetVideo, setSelectedDatasetVideo] = useState<string>("");
  const [sampleCounts, setSampleCounts] = useState<Record<TrafficLabel, number>>({
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
  });

  const loadModels = async () => {
    if (isModelsReady || isLoadingModels) return;
    setIsLoadingModels(true);
    setDetectionError(null);
    try {
      await tf.ready();
      detectorRef.current = await cocoSsd.load({ base: "mobilenet_v2" });
      featureExtractorRef.current = await mobilenet.load({ version: 2, alpha: 1 });
      setIsModelsReady(true);
    } catch (error) {
      setDetectionError(error instanceof Error ? error.message : "Failed to load models.");
    } finally {
      setIsLoadingModels(false);
    }
  };

  const startCamera = async () => {
    await loadModels();
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setDetectionError(null);
    } catch (error) {
      setDetectionError(error instanceof Error ? error.message : "Unable to access camera.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const useVideoFile = async (file: File) => {
    await loadModels();
    if (!videoRef.current) return;
    stopCamera();
    const objectUrl = URL.createObjectURL(file);
    videoRef.current.src = objectUrl;
    videoRef.current.muted = true;
    videoRef.current.loop = true;
    await videoRef.current.play();
  };

  const useDatasetVideo = async (videoPath: string) => {
    await loadModels();
    if (!videoRef.current) return;
    stopCamera();
    videoRef.current.srcObject = null;
    videoRef.current.src = videoPath;
    videoRef.current.muted = true;
    videoRef.current.loop = true;
    await videoRef.current.play();
  };

  const runDetectionFrame = async () => {
    if (!videoRef.current || !detectorRef.current || !featureExtractorRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState < 2) {
      rafRef.current = requestAnimationFrame(runDetectionFrame);
      return;
    }

    // Set canvas dimensions to match actual video stream dimensions
    if (canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.style.width = `${video.clientWidth}px`;
      canvas.style.height = `${video.clientHeight}px`;
    }

    const detections = await detectorRef.current.detect(video, 30, 0.35);
    
    // Draw bounding boxes on canvas
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      detections.forEach((d) => {
        const [x, y, w, h] = d.bbox;

        // Draw deep electric blue bounding box
        ctx.strokeStyle = "#2563eb"; // Deep blue
        ctx.lineWidth = Math.max(3, Math.round(canvas.width / 220));
        
        // Neon outer glow
        ctx.shadowColor = "#3b82f6"; // Glow blue
        ctx.shadowBlur = 10;
        ctx.strokeRect(x, y, w, h);
        ctx.shadowBlur = 0; // reset

        // Label background
        ctx.fillStyle = "#2563eb";
        const fontSize = Math.max(12, Math.round(canvas.width / 48));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const labelText = `${d.class.toUpperCase()} (${Math.round(d.score * 100)}%)`;
        const textWidth = ctx.measureText(labelText).width;
        
        ctx.fillRect(x - 1, y - fontSize - 8, textWidth + 12, fontSize + 8);

        // Label text
        ctx.fillStyle = "#ffffff";
        ctx.fillText(labelText, x + 5, y - 6);
      });
    }

    const counts = { cars: 0, bikes: 0, buses: 0, trucks: 0 };
    detections.forEach((d) => {
      if (d.class === "car") counts.cars += 1;
      else if (d.class === "motorcycle" || d.class === "bicycle") counts.bikes += 1;
      else if (d.class === "bus") counts.buses += 1;
      else if (d.class === "truck") counts.trucks += 1;
    });
    const vehicleCount = counts.cars + counts.bikes + counts.buses + counts.trucks;
    const topClasses = detections
      .slice(0, 4)
      .map((d) => `${d.class} (${Math.round(d.score * 100)}%)`)
      .join(", ");

    const level = getTrafficLevel(vehicleCount);
    const adaptiveSignal = getSignalTime(vehicleCount);
    setVehicleBreakdown(counts);
    setSimTrafficLevel(level);
    setSimSignalTime(adaptiveSignal);
    setSimTimer((prev) => Math.min(prev, adaptiveSignal));

    setDetectionSummary(
      `Detected ${vehicleCount} vehicles. ${topClasses ? `Top objects: ${topClasses}` : "No strong object classes yet."}`,
    );

    if (classifierRef.current.getNumClasses() > 0) {
      const embedding = featureExtractorRef.current.infer(video, true) as tf.Tensor;
      const result = await classifierRef.current.predictClass(embedding);
      setPrediction(`Trained traffic level: ${result.label} (${(result.confidences[result.label] * 100).toFixed(1)}%)`);
      embedding.dispose();
    }

    if (isDetecting) {
      rafRef.current = requestAnimationFrame(runDetectionFrame);
    }
  };

  const startDetection = async () => {
    await loadModels();
    setIsDetecting(true);
  };

  const stopDetection = () => {
    setIsDetecting(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const addTrainingSample = async (label: TrafficLabel) => {
    if (!videoRef.current || !featureExtractorRef.current) return;
    const embedding = featureExtractorRef.current.infer(videoRef.current, true) as tf.Tensor;
    classifierRef.current.addExample(embedding, label);
    embedding.dispose();
    setSampleCounts((prev) => ({ ...prev, [label]: prev[label] + 1 }));
  };

  const resetTraining = () => {
    classifierRef.current.clearAllClasses();
    setSampleCounts({ LOW: 0, MEDIUM: 0, HIGH: 0 });
    setPrediction("Not trained yet");
  };

  useEffect(() => {
    if (isDetecting) {
      runDetectionFrame();
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDetecting]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSimTimer((prev) => {
        if (prev <= 1) {
          setSimPhase((phase) => {
            if (phase === "NS_GREEN") return "NS_YELLOW";
            if (phase === "NS_YELLOW") return "EW_GREEN";
            if (phase === "EW_GREEN") return "EW_YELLOW";
            return "NS_GREEN";
          });
          if (simPhase === "NS_GREEN" || simPhase === "EW_GREEN") return 3;
          return simSignalTime;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [simPhase, simSignalTime]);

  useEffect(() => {
    // Sync timer when adaptive green duration changes.
    if (simPhase === "NS_GREEN" || simPhase === "EW_GREEN") {
      setSimTimer((prev) => Math.min(prev, simSignalTime));
    }
  }, [simPhase, simSignalTime]);

  useEffect(() => {
    const loadDatasetManifest = async () => {
      try {
        const response = await fetch("/datasets/kaggle/dataset.json");
        if (!response.ok) return;
        const payload = (await response.json()) as KaggleDatasetManifest;
        const videos = payload.videos ?? [];
        setDatasetInfo({
          name: payload.name ?? "Kaggle Traffic Dataset",
          description: payload.description ?? "",
        });
        setDatasetVideos(videos);
        if (videos.length > 0) {
          setSelectedDatasetVideo(videos[0].path);
        }
      } catch {
        // No dataset manifest yet - user can still upload manual videos.
      }
    };

    void loadDatasetManifest();
  }, []);

  useEffect(() => {
    return () => {
      stopDetection();
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Camera Training & Live Detection</h2>
        <p className="text-sm text-muted-foreground">
          Run real-time detection from webcam or video footage and train a traffic-level classifier directly in browser.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        {datasetInfo && (
          <div className="rounded-md border bg-muted/20 p-3 space-y-2">
            <p className="text-sm font-semibold">{datasetInfo.name}</p>
            {datasetInfo.description && <p className="text-xs text-muted-foreground">{datasetInfo.description}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedDatasetVideo}
                onChange={(event) => setSelectedDatasetVideo(event.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-xs min-w-[260px]"
              >
                {datasetVideos.map((video) => (
                  <option key={video.id} value={video.path}>
                    {video.title}
                    {video.split ? ` (${video.split})` : ""}
                    {video.suggestedLabel ? ` - label ${video.suggestedLabel}` : ""}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedDatasetVideo}
                onClick={() => void useDatasetVideo(selectedDatasetVideo)}
              >
                Load Kaggle Dataset Video
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={startCamera} variant="default" className="gap-2">
            <Camera className="h-4 w-4" />
            Use My Camera
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Use Video Footage
          </Button>
          <Button type="button" variant={isDetecting ? "destructive" : "secondary"} className="gap-2" onClick={isDetecting ? stopDetection : startDetection}>
            {isDetecting ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isDetecting ? "Stop Detection" : "Start Detection"}
          </Button>
          {(isLoadingModels || !isModelsReady) && (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading AI models...
            </span>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void useVideoFile(file);
            }
          }}
        />
        {detectionError && <p className="text-sm text-destructive">{detectionError}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl border bg-black p-3 relative flex items-center justify-center overflow-hidden">
          <video ref={videoRef} className="w-full rounded-md max-h-[540px]" autoPlay playsInline controls />
          <canvas ref={canvasRef} className="absolute pointer-events-none rounded-md" />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Kaggle Video Traffic Simulation</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border p-2">
                <p className="text-xs text-muted-foreground">Traffic Level</p>
                <p className="font-semibold">{simTrafficLevel}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-xs text-muted-foreground">Adaptive Green Time</p>
                <p className="font-semibold">{simSignalTime}s</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-xs text-muted-foreground">Signal Phase</p>
                <p className="font-semibold">{simPhase}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-xs text-muted-foreground">Phase Timer</p>
                <p className="font-semibold">{simTimer}s</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="rounded-md border p-2 text-center">
                <p className="text-muted-foreground">Cars</p>
                <p className="font-semibold">{vehicleBreakdown.cars}</p>
              </div>
              <div className="rounded-md border p-2 text-center">
                <p className="text-muted-foreground">Bikes</p>
                <p className="font-semibold">{vehicleBreakdown.bikes}</p>
              </div>
              <div className="rounded-md border p-2 text-center">
                <p className="text-muted-foreground">Buses</p>
                <p className="font-semibold">{vehicleBreakdown.buses}</p>
              </div>
              <div className="rounded-md border p-2 text-center">
                <p className="text-muted-foreground">Trucks</p>
                <p className="font-semibold">{vehicleBreakdown.trucks}</p>
              </div>
            </div>
          </div>

          {/* AI Traffic Signal Controller Visual Simulator */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Signal Controller Visual</h3>
              <span className="font-mono text-xs font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded">
                TIMER: {simTimer}s
              </span>
            </div>
            
            <div className="flex items-center justify-center rounded-lg border bg-zinc-950/40 p-4 relative" style={{ minHeight: 220 }}>
              <div className="relative h-44 w-44">
                {/* Simulated Roads */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-12 bg-muted-foreground/10 rounded" />
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-12 bg-muted-foreground/10 rounded" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 bg-muted-foreground/20 rounded" />
                
                {/* 4-Way Traffic Lights */}
                {DIRECTIONS.map((dir) => {
                  const getVisualSignalState = (d: typeof dir): "RED" | "YELLOW" | "GREEN" => {
                    const isNS = d === "north" || d === "south";
                    if (simPhase === "NS_GREEN") return isNS ? "GREEN" : "RED";
                    if (simPhase === "NS_YELLOW") return isNS ? "YELLOW" : "RED";
                    if (simPhase === "EW_GREEN") return isNS ? "RED" : "GREEN";
                    return isNS ? "RED" : "YELLOW"; // EW_YELLOW
                  };
                  return (
                    <div key={dir} className={`absolute ${DIR_POSITIONS[dir]} flex flex-col items-center gap-0.5`}>
                      <span className="text-[9px] font-extrabold text-muted-foreground/60">{DIR_LABELS[dir]}</span>
                      <TrafficLight state={getVisualSignalState(dir)} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live Detection Output</h3>
            <p className="text-sm">{detectionSummary}</p>
            <p className="text-sm font-semibold">{prediction}</p>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Training Controls</h3>
            <p className="text-xs text-muted-foreground">
              Capture labeled examples from camera/video, then run detection for trained traffic-level prediction.
            </p>

            {LABELS.map((label) => (
              <div key={label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{trafficHints[label]}</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <span className="text-xs font-mono text-muted-foreground">{sampleCounts[label]} samples</span>
                  <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => addTrainingSample(label)}>
                    <Brain className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="ghost" size="sm" onClick={resetTraining}>
              Reset Training
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
