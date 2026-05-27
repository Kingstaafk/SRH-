import { ExternalLink, Video } from "lucide-react";
import { TrafficDatasetSource } from "@/hooks/use-traffic-simulation";

type LiveCamera = {
  id: string;
  name: string;
  location: string;
  embedUrl: string;
  sourceUrl: string;
};

const ONLINE_DATASET_CAMERAS: LiveCamera[] = [
  {
    id: "london-parliament-square",
    name: "Parliament Square Traffic",
    location: "London, UK",
    embedUrl: "https://www.youtube.com/embed/6dbdVhVSat8",
    sourceUrl: "https://www.youtube.com/watch?v=6dbdVhVSat8",
  },
  {
    id: "london-abbey-road",
    name: "Abbey Road Traffic",
    location: "London, UK",
    embedUrl: "https://www.youtube.com/embed/HpdO5Kq3o7Y",
    sourceUrl: "https://www.youtube.com/watch?v=HpdO5Kq3o7Y",
  },
  {
    id: "london-city-streets",
    name: "Central London Streets",
    location: "London, UK",
    embedUrl: "https://www.youtube.com/embed/9Auq9mYxFEE",
    sourceUrl: "https://www.youtube.com/watch?v=9Auq9mYxFEE",
  },
];

const DELHI_CAMERAS: LiveCamera[] = [
  {
    id: "delhi-ito",
    name: "ITO Crossing Ambient Feed",
    location: "IP Marg, New Delhi",
    embedUrl: "https://www.youtube.com/embed/fH-W1T6n4Jg?autoplay=1&mute=1&loop=1&playlist=fH-W1T6n4Jg",
    sourceUrl: "https://www.youtube.com/watch?v=fH-W1T6n4Jg",
  },
  {
    id: "delhi-cp",
    name: "Connaught Place Traffic POV",
    location: "Inner Ring Road, CP, New Delhi",
    embedUrl: "https://www.youtube.com/embed/fH-W1T6n4Jg?autoplay=1&mute=1&start=120",
    sourceUrl: "https://www.youtube.com/watch?v=fH-W1T6n4Jg",
  },
  {
    id: "delhi-noida",
    name: "DND Flyway Expressway Flow",
    location: "DND Flyway, Delhi-Noida",
    embedUrl: "https://www.youtube.com/embed/1-iS7LArMPA?autoplay=1&mute=1",
    sourceUrl: "https://www.youtube.com/watch?v=1-iS7LArMPA",
  },
];

const LUCKNOW_CAMERAS: LiveCamera[] = [
  {
    id: "lucknow-hazratganj",
    name: "Hazratganj Atal Chowk Feed",
    location: "Hazratganj, Lucknow",
    embedUrl: "https://www.youtube.com/embed/1-iS7LArMPA?autoplay=1&mute=1&start=20",
    sourceUrl: "https://www.youtube.com/watch?v=1-iS7LArMPA",
  },
  {
    id: "lucknow-gomtinagar",
    name: "1090 Chauraha View",
    location: "Gomti Nagar, Lucknow",
    embedUrl: "https://www.youtube.com/embed/1-iS7LArMPA?autoplay=1&mute=1&start=60",
    sourceUrl: "https://www.youtube.com/watch?v=1-iS7LArMPA",
  },
];

const LOCAL_SIMULATION_CAMERAS: LiveCamera[] = [
  {
    id: "city-traffic-demo-1",
    name: "Urban Road Demo Feed",
    location: "Demo camera",
    embedUrl: "https://www.youtube.com/embed/1-iS7LArMPA",
    sourceUrl: "https://www.youtube.com/watch?v=1-iS7LArMPA",
  },
];

interface LiveTrafficCamerasProps {
  datasetSource: TrafficDatasetSource;
  datasetName: string;
}

export default function LiveTrafficCameras({ datasetSource, datasetName }: LiveTrafficCamerasProps) {
  const cameras =
    datasetSource === "online" ? ONLINE_DATASET_CAMERAS :
    datasetSource === "delhi" ? DELHI_CAMERAS :
    datasetSource === "lucknow" ? LUCKNOW_CAMERAS :
    LOCAL_SIMULATION_CAMERAS;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live Traffic Camera Footage</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {datasetSource === "online"
              ? `Footage aligned with ${datasetName}`
              : "Footage for local simulation mode"}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-traffic-red/10 px-2 py-0.5 text-[10px] font-semibold text-traffic-red">
          <Video className="h-3 w-3" />
          LIVE
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cameras.map((camera) => (
          <div key={camera.id} className="rounded-lg border bg-background overflow-hidden">
            <div className="aspect-video bg-black">
              <iframe
                className="h-full w-full"
                src={camera.embedUrl}
                title={camera.name}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold">{camera.name}</p>
              <p className="text-xs text-muted-foreground">{camera.location}</p>
              <a
                href={camera.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Open source stream
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
