from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
import numpy as np
import soundfile as sf

TARGET_SAMPLE_RATE = 16000
TARGET_CHANNELS = 1


def normalize_to_wav(
    input_audio_path: str,
    output_wav_path: str | None = None,
) -> tuple[str, float, int, int]:
    """
    Convert any uploaded audio format (.webm, .mp3, .m4a, .ogg, .wav, .flac)
    to a standardized 16 kHz, mono, 16-bit PCM WAV file.

    Returns:
        tuple of (normalized_path, duration_seconds, sample_rate, channels)
    """
    src = Path(input_audio_path).resolve()
    if not src.exists():
        raise FileNotFoundError(f"Input audio file not found: {src}")

    if output_wav_path:
        dst = Path(output_wav_path).resolve()
    else:
        dst = src.parent / f"{src.stem}_norm16k.wav"

    dst.parent.mkdir(parents=True, exist_ok=True)

    print(f"[AUDIO] Normalizing audio file: {src.name} -> {dst.name}")
    conversion_errors: list[str] = []

    # -------------------------------------------------------------
    # Method 1: System FFmpeg CLI (fastest & robust if available)
    # -------------------------------------------------------------
    ffmpeg_bin = shutil.which("ffmpeg")
    if ffmpeg_bin:
        try:
            cmd = [
                ffmpeg_bin,
                "-y",
                "-i",
                str(src),
                "-vn",
                "-acodec",
                "pcm_s16le",
                "-ac",
                str(TARGET_CHANNELS),
                "-ar",
                str(TARGET_SAMPLE_RATE),
                str(dst),
            ]
            res = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=True,
            )
            if dst.exists() and dst.stat().st_size > 44:
                info = sf.info(str(dst))
                print(
                    f"[AUDIO] Normalized via FFmpeg CLI: "
                    f"duration={info.duration:.2f}s, sr={info.samplerate}, ch={info.channels}"
                )
                return str(dst), float(info.duration), int(info.samplerate), int(info.channels)
        except Exception as exc:
            conversion_errors.append(f"FFmpeg CLI failed: {exc}")

    # -------------------------------------------------------------
    # Method 2: PyAV (Native LibAV bindings, no external binary needed)
    # -------------------------------------------------------------
    try:
        import av

        container = av.open(str(src))
        audio_stream = next((s for s in container.streams if s.type == "audio"), None)
        if audio_stream is None:
            raise ValueError("No audio stream found in media container")

        resampler = av.AudioResampler(
            format="s16",
            layout="mono",
            rate=TARGET_SAMPLE_RATE,
        )

        frames = []
        for frame in container.decode(audio_stream):
            for r_frame in resampler.resample(frame):
                frames.append(r_frame.to_ndarray())

        for r_frame in resampler.resample(None):
            frames.append(r_frame.to_ndarray())

        container.close()

        if not frames:
            raise ValueError("PyAV decoded 0 audio frames")

        audio_arr = np.concatenate(frames, axis=1).squeeze()
        sf.write(
            str(dst),
            audio_arr,
            TARGET_SAMPLE_RATE,
            subtype="PCM_16",
        )

        duration = len(audio_arr) / float(TARGET_SAMPLE_RATE)
        print(
            f"[AUDIO] Normalized via PyAV: "
            f"duration={duration:.2f}s, sr={TARGET_SAMPLE_RATE}, ch=1"
        )
        return str(dst), float(duration), TARGET_SAMPLE_RATE, 1
    except Exception as exc:
        conversion_errors.append(f"PyAV failed: {exc}")

    # -------------------------------------------------------------
    # Method 3: Soundfile read/write fallback
    # -------------------------------------------------------------
    try:
        data, sr = sf.read(str(src), dtype="float32")
        if data.ndim > 1:
            data = np.mean(data, axis=1)

        if sr != TARGET_SAMPLE_RATE:
            import scipy.signal
            num_samples = int(len(data) * TARGET_SAMPLE_RATE / sr)
            data = scipy.signal.resample(data, num_samples)

        data_int16 = (np.clip(data, -1.0, 1.0) * 32767).astype(np.int16)
        sf.write(str(dst), data_int16, TARGET_SAMPLE_RATE, subtype="PCM_16")
        duration = len(data_int16) / float(TARGET_SAMPLE_RATE)
        print(
            f"[AUDIO] Normalized via Soundfile/Scipy: "
            f"duration={duration:.2f}s, sr={TARGET_SAMPLE_RATE}, ch=1"
        )
        return str(dst), float(duration), TARGET_SAMPLE_RATE, 1
    except Exception as exc:
        conversion_errors.append(f"Soundfile failed: {exc}")

    raise RuntimeError(
        f"Failed to normalize audio '{src.name}'. All converters failed: "
        + " | ".join(conversion_errors)
    )
