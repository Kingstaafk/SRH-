export default function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">About This Project</h2>
        <p className="text-sm text-muted-foreground">Smart Traffic Management System — Civil Engineering Final Year Project</p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-foreground/80">
        <section className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h3 className="text-base font-semibold text-foreground">System Overview</h3>
          <p>This system simulates a smart traffic intersection where an AI model (YOLOv8) detects vehicles in real time using OpenCV. Vehicle counts dynamically control traffic signals and detect congestion. Results are displayed on a live dashboard.</p>
        </section>

        <section className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h3 className="text-base font-semibold text-foreground">AI Vehicle Detection</h3>
          <p>Uses YOLOv8 to detect: <strong>cars, motorbikes, buses, trucks</strong>.</p>
          <p>Traffic density classification:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="text-traffic-green font-medium">LOW</span>: 0–10 vehicles</li>
            <li><span className="text-traffic-yellow font-medium">MEDIUM</span>: 10–25 vehicles</li>
            <li><span className="text-traffic-red font-medium">HIGH</span>: 25+ vehicles</li>
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h3 className="text-base font-semibold text-foreground">Signal Control Algorithm</h3>
          <div className="font-mono text-xs bg-muted p-4 rounded-lg">
            <p>{"if vehicle_count < 10 → signal_time = 20s"}</p>
            <p>{"if vehicle_count 10–25 → signal_time = 40s"}</p>
            <p>{"if vehicle_count > 25 → signal_time = 60s"}</p>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h3 className="text-base font-semibold text-foreground">Tech Stack</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-muted p-3"><strong>Frontend:</strong> React + Tailwind CSS</div>
            <div className="rounded-lg bg-muted p-3"><strong>Backend:</strong> FastAPI (Python)</div>
            <div className="rounded-lg bg-muted p-3"><strong>Database:</strong> MongoDB</div>
            <div className="rounded-lg bg-muted p-3"><strong>AI:</strong> YOLOv8 + OpenCV</div>
            <div className="rounded-lg bg-muted p-3"><strong>Map:</strong> Leaflet + OpenStreetMap</div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h3 className="text-base font-semibold text-foreground">How to Run (Full Stack)</h3>
          <div className="font-mono text-xs bg-muted p-4 rounded-lg space-y-4">
            <div>
              <p className="text-muted-foreground"># Backend (FastAPI)</p>
              <p>cd backend</p>
              <p>pip install fastapi uvicorn pymongo</p>
              <p>uvicorn main:app --reload --port 8000</p>
            </div>
            <div>
              <p className="text-muted-foreground"># AI Module</p>
              <p>pip install ultralytics opencv-python requests</p>
              <p>python ai_module/vehicle_detection.py</p>
            </div>
            <div>
              <p className="text-muted-foreground"># Frontend (this app)</p>
              <p>npm install && npm run dev</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h3 className="text-base font-semibold text-foreground">Backend API Reference</h3>
          <pre className="font-mono text-xs bg-muted p-4 rounded-lg whitespace-pre-wrap">{`POST /api/traffic-data

{
  "intersection_id": "INT_01",
  "vehicle_count": 28,
  "traffic_level": "HIGH",
  "signal_time": 60,
  "timestamp": "2026-03-12T10:30:00"
}`}</pre>
        </section>

        <section className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h3 className="text-base font-semibold text-foreground">Python Backend Code (main.py)</h3>
          <pre className="font-mono text-xs bg-muted p-4 rounded-lg whitespace-pre-wrap">{`from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"],
    allow_methods=["*"], allow_headers=["*"])

client = MongoClient("mongodb://localhost:27017")
db = client["smart_traffic"]
collection = db["traffic_data"]

class TrafficData(BaseModel):
    intersection_id: str
    vehicle_count: int
    traffic_level: str
    signal_time: int
    timestamp: str

@app.post("/api/traffic-data")
def post_traffic(data: TrafficData):
    collection.insert_one(data.dict())
    return {"status": "ok", "signal_time": data.signal_time}

@app.get("/api/traffic-data")
def get_traffic():
    results = list(collection.find({}, {"_id": 0})
        .sort("timestamp", -1).limit(20))
    return results`}</pre>
        </section>

        <section className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h3 className="text-base font-semibold text-foreground">AI Detection Script (vehicle_detection.py)</h3>
          <pre className="font-mono text-xs bg-muted p-4 rounded-lg whitespace-pre-wrap">{`from ultralytics import YOLO
import cv2, requests, time

model = YOLO("yolov8n.pt")
CLASSES = {2: "car", 3: "motorbike", 5: "bus", 7: "truck"}
API_URL = "http://localhost:8000/api/traffic-data"

cap = cv2.VideoCapture(0)  # or video file path

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    results = model(frame)
    counts = {"car": 0, "motorbike": 0, "bus": 0, "truck": 0}
    for r in results:
        for box in r.boxes:
            cls = int(box.cls[0])
            if cls in CLASSES:
                counts[CLASSES[cls]] += 1
    total = sum(counts.values())
    level = "LOW" if total <= 10 else \\
        "MEDIUM" if total <= 25 else "HIGH"
    sig = 20 if total < 10 else 40 if total <= 25 else 60
    requests.post(API_URL, json={
        "intersection_id": "INT_01",
        "vehicle_count": total,
        "traffic_level": level,
        "signal_time": sig,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S")
    })
    cv2.imshow("Detection", results[0].plot())
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break
cap.release()
cv2.destroyAllWindows()`}</pre>
        </section>
      </div>
    </div>
  );
}
