from pathlib import Path
from app.pipeline.orchestrator import process_audio


RECORDINGS_DIR = Path(
    r"C:\Users\vasud\Downloads\kahaani-relders-test"
)


def main():
    files = sorted(
        RECORDINGS_DIR.glob("*.mp3"),
        key=lambda p: p.name
    )

    if not files:
        print("No MP3 recordings found.")
        return

    print("=" * 100)
    print("KAHAANI-CHECK — REAL ELDER RECORDING VALIDATION")
    print("=" * 100)
    print()

    results = []

    for audio_file in files:
        print("-" * 100)
        print(f"Processing: {audio_file.name}")
        print("-" * 100)

        try:
            result = process_audio(str(audio_file))

            quality = result.get("quality", {})

            if result["status"] == "rejected":
                print("STATUS: REJECTED")
                print(f"Duration: {quality.get('duration_seconds')}")
                print(f"SNR: {quality.get('snr_db')}")
                print(f"Clipping: {quality.get('clipping_ratio')}")
                print(f"Reason: {quality.get('reason')}")

                results.append({
                    "file": audio_file.name,
                    "status": "REJECTED",
                    "duration": quality.get("duration_seconds"),
                    "wpm": None,
                    "pause_density": None,
                    "ttr": None,
                })

                continue

            features = result["features"]
            transcription = result["transcription"]

            print("STATUS: PROCESSED")
            print()
            print("QUALITY")
            print(f"  Duration: {quality.get('duration_seconds'):.2f} sec")
            print(f"  SNR:      {quality.get('snr_db'):.2f} dB")
            print(f"  Clipping: {quality.get('clipping_ratio'):.6f}")

            print()
            print("TRANSCRIPTION")
            print(f"  Language: {transcription.get('language')}")
            print(f"  Model:    {transcription.get('model_name')}")
            print(
                f"  Text preview: "
                f"{transcription.get('text', '')[:250]}"
            )

            print()
            print("FEATURES")
            print(
                f"  Speaking rate:     "
                f"{features.get('speaking_rate_wpm'):.2f} WPM"
            )
            print(
                f"  Pause density:     "
                f"{features.get('pause_density'):.4f}"
            )
            print(
                f"  Lexical diversity: "
                f"{features.get('lexical_diversity_ttr'):.4f}"
            )
            print(
                f"  Speech duration:   "
                f"{features.get('speech_duration_seconds'):.2f} sec"
            )

            results.append({
                "file": audio_file.name,
                "status": "PROCESSED",
                "duration": features.get(
                    "speech_duration_seconds"
                ),
                "wpm": features.get(
                    "speaking_rate_wpm"
                ),
                "pause_density": features.get(
                    "pause_density"
                ),
                "ttr": features.get(
                    "lexical_diversity_ttr"
                ),
            })

        except Exception as exc:
            print("ERROR")
            print(f"  {type(exc).__name__}: {exc}")

            results.append({
                "file": audio_file.name,
                "status": "ERROR",
                "duration": None,
                "wpm": None,
                "pause_density": None,
                "ttr": None,
            })

        print()

    # ---------------------------------------------------------
    # Summary
    # ---------------------------------------------------------

    print()
    print("=" * 100)
    print("SUMMARY")
    print("=" * 100)

    print(
        f"{'Recording':<12}"
        f"{'Status':<14}"
        f"{'Duration':>12}"
        f"{'WPM':>12}"
        f"{'Pause':>12}"
        f"{'TTR':>12}"
    )

    print("-" * 100)

    for r in results:
        duration = (
            f"{r['duration']:.2f}"
            if r["duration"] is not None
            else "-"
        )

        wpm = (
            f"{r['wpm']:.2f}"
            if r["wpm"] is not None
            else "-"
        )

        pause = (
            f"{r['pause_density']:.4f}"
            if r["pause_density"] is not None
            else "-"
        )

        ttr = (
            f"{r['ttr']:.4f}"
            if r["ttr"] is not None
            else "-"
        )

        print(
            f"{r['file']:<12}"
            f"{r['status']:<14}"
            f"{duration:>12}"
            f"{wpm:>12}"
            f"{pause:>12}"
            f"{ttr:>12}"
        )

    print("=" * 100)


if __name__ == "__main__":
    main()