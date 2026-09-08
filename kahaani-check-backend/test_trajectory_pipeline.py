from app.pipeline.orchestrator import process_audio
from app.services.baseline_service import calculate_baseline, get_baseline
from app.services.trajectory_engine import compare_with_baseline


AUDIO_PATH = r"C:\Users\vasud\Downloads\kahaani_samples\2_rec.mp3"
ELDER_ID = "f799f3c8-46b7-468c-899a-52db203b1fab"


print("=" * 70)
print("KAHAANI-CHECK — TRAJECTORY PIPELINE")
print("=" * 70)

print("\nProcessing audio...")

pipeline = process_audio(AUDIO_PATH)

if pipeline["status"] != "processed":
    print("PIPELINE REJECTED")
    print(pipeline)
    raise SystemExit

features = pipeline["features"]

print("\nCurrent Features:")
print(features)

print("\nGetting baseline...")

baseline = get_baseline(ELDER_ID)

if baseline is None:
    print("No saved baseline found.")
    raise SystemExit

print("\nBaseline:")
print(baseline)

if baseline["sample_count"] < 3:
    print("\nBASELINE STATUS: INSUFFICIENT DATA")
    print("Trajectory comparison skipped.")
    print(
        f"Current baseline contains "
        f"{baseline['sample_count']} sample(s)."
    )
    raise SystemExit

trajectory = compare_with_baseline(
    current_features=features,
    baseline=baseline,
)

print("\nTrajectory Result:")
print(trajectory)

print("\n" + "=" * 70)
print("TRAJECTORY PIPELINE: OK")
print("=" * 70)