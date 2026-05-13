#!/usr/bin/env python3
"""
Download a Kaggle dataset with kagglehub and prepare it for this app.

Usage:
  python scripts/setup_kaggle_dataset.py
  python scripts/setup_kaggle_dataset.py --dataset "owner/dataset-name"
"""

from __future__ import annotations

import argparse
import json
import shutil
import time
import sys
from pathlib import Path

VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".m4v"}


def find_video_files(root: Path) -> list[Path]:
    return [path for path in root.rglob("*") if path.is_file() and path.suffix.lower() in VIDEO_EXTENSIONS]


def safe_name(name: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in {"-", "_", "."} else "_" for ch in name)
    return cleaned.strip("._") or "video"


def copy_videos(video_paths: list[Path], destination_dir: Path) -> list[Path]:
    destination_dir.mkdir(parents=True, exist_ok=True)
    copied: list[Path] = []

    for index, source in enumerate(video_paths, start=1):
        stem = safe_name(source.stem)
        suffix = source.suffix.lower()
        candidate = destination_dir / f"{stem}{suffix}"
        bump = 1
        while candidate.exists():
            candidate = destination_dir / f"{stem}_{bump}{suffix}"
            bump += 1
        shutil.copy2(source, candidate)
        copied.append(candidate)
        print(f"[{index}/{len(video_paths)}] Copied: {source} -> {candidate}")

    return copied


def build_manifest(dataset_slug: str, videos_dir: Path, copied_files: list[Path]) -> dict:
    relative_base = "/" + videos_dir.as_posix().split("/public/", 1)[1]
    manifest_videos = []
    for i, path in enumerate(copied_files, start=1):
        manifest_videos.append(
            {
                "id": f"kaggle-{i}",
                "title": path.stem.replace("_", " ").replace("-", " ").title(),
                "path": f"{relative_base}/{path.name}",
                "split": "train",
                "suggestedLabel": "MEDIUM",
            }
        )

    return {
        "name": f"Kaggle Dataset: {dataset_slug}",
        "description": "Auto-generated manifest for Camera Training page.",
        "videos": manifest_videos,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Download Kaggle videos and generate app dataset manifest.")
    parser.add_argument("--dataset", default="unidpro/real-time-traffic-video-dataset", help="Kaggle dataset slug")
    parser.add_argument("--retries", type=int, default=5, help="Retry count for interrupted downloads")
    parser.add_argument("--retry-delay", type=int, default=8, help="Seconds between retries")
    parser.add_argument(
        "--project-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Path to project root",
    )
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    videos_dir = project_root / "public" / "datasets" / "kaggle" / "videos"
    manifest_path = project_root / "public" / "datasets" / "kaggle" / "dataset.json"

    try:
        import kagglehub  # type: ignore
    except Exception as exc:
        print("Failed to import kagglehub. Install it with: pip install kagglehub", file=sys.stderr)
        print(f"Import error: {exc}", file=sys.stderr)
        return 1

    print(f"Downloading dataset: {args.dataset}")
    downloaded_path: Path | None = None

    for attempt in range(1, args.retries + 1):
        try:
            downloaded_path = Path(kagglehub.dataset_download(args.dataset)).resolve()
            break
        except Exception as exc:
            print(f"Download attempt {attempt}/{args.retries} failed: {exc}", file=sys.stderr)
            if attempt >= args.retries:
                print(
                    "Dataset download failed after retries. Re-run the same command; kagglehub will resume from cache.",
                    file=sys.stderr,
                )
                return 3
            wait_seconds = args.retry_delay * attempt
            print(f"Retrying in {wait_seconds} seconds...", file=sys.stderr)
            time.sleep(wait_seconds)

    if downloaded_path is None:
        return 3

    print(f"Downloaded to: {downloaded_path}")

    videos = find_video_files(downloaded_path)
    if not videos:
        print("No video files found in downloaded dataset.", file=sys.stderr)
        return 2

    print(f"Found {len(videos)} video files. Copying to project dataset folder...")
    copied = copy_videos(videos, videos_dir)

    manifest = build_manifest(args.dataset, videos_dir, copied)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"Manifest generated: {manifest_path}")
    print("Done. Open /camera-training and load Kaggle dataset videos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
