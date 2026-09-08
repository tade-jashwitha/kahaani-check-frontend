import json
from pathlib import Path

from app.pipeline.orchestrator import process_audio


SAMPLES_DIR = Path(r"C:\Users\vasud\Downloads\kahaani_samples")


results = []

for audio_path in sorted(SAMPLES_DIR.glob("*")):
    if audio_path.suffix.lower() not in {
        ".wav",
        ".mp3",
        ".m4a",
        ".ogg",
        ".flac",
    }:
        continue

    print(f"\nProcessing: {audio_path.name}")

    result = process_audio(str(audio_path))

    if result["status"] == "rejected":
        results.append({
            "sample": audio_path.name,
            "status": "REJECTED",
            "duration_seconds": result["quality"]["duration_seconds"],
            "speaking_rate_wpm": None,
            "pause_density": None,
            "lexical_diversity_ttr": None,
        })
        continue

    features = result["features"]

    results.append({
        "sample": audio_path.name,
        "status": "PASSED",
        "duration_seconds": round(
            result["quality"]["duration_seconds"], 2
        ),
        "speaking_rate_wpm": round(
            features["speaking_rate_wpm"], 2
        ),
        "pause_density": round(
            features["pause_density"], 4
        ),
        "lexical_diversity_ttr": round(
            features["lexical_diversity_ttr"], 4
        ),
    })


print("\n" + "=" * 80)
print("KAHAANI-CHECK — TIER 1 VALIDATION")
print("=" * 80)

print(json.dumps(results, indent=2, ensure_ascii=False))