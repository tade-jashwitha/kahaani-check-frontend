from dataclasses import dataclass

import librosa
import numpy as np


@dataclass
class QualityResult:
    passed: bool
    duration_seconds: float
    snr_db: float
    clipping_ratio: float
    reason: str | None = None


# =========================================================
# MVP thresholds
# =========================================================

MIN_DURATION_SECONDS = 5.0
MAX_DURATION_SECONDS = 300.0

# We keep this permissive because recordings may come from
# phones or telephone calls.
MIN_SNR_DB = 10.0

MAX_CLIPPING_RATIO = 0.01


# =========================================================
# SNR configuration
# =========================================================

FRAME_LENGTH = 2048
HOP_LENGTH = 512

# Lowest-energy frames used to estimate the noise floor.
NOISE_PERCENTILE = 20


def _estimate_snr(
    audio: np.ndarray,
) -> float:
    """
    Estimate an approximate recording SNR.

    IMPORTANT:
    This is an MVP audio-quality indicator, not a
    laboratory-grade SNR measurement.

    We use short-time RMS energy rather than individual
    samples. This avoids the unrealistic SNR values that
    occurred with the previous implementation.
    """

    if audio.size == 0:
        return 0.0

    # -----------------------------------------------------
    # Short-time RMS
    # -----------------------------------------------------

    rms = librosa.feature.rms(
        y=audio,
        frame_length=FRAME_LENGTH,
        hop_length=HOP_LENGTH,
    )[0]

    if rms.size == 0:
        return 0.0

    rms = rms[
        np.isfinite(rms)
    ]

    if rms.size == 0:
        return 0.0

    # -----------------------------------------------------
    # Remove completely silent frames
    # -----------------------------------------------------

    positive_rms = rms[
        rms > 1e-8
    ]

    if positive_rms.size == 0:
        return 0.0

    # -----------------------------------------------------
    # Estimate signal level
    # -----------------------------------------------------

    # Use a high percentile rather than the maximum so one
    # loud transient does not dominate the estimate.
    signal_rms = float(
        np.percentile(
            positive_rms,
            90,
        )
    )

    # -----------------------------------------------------
    # Estimate noise level
    # -----------------------------------------------------

    noise_rms = float(
        np.percentile(
            positive_rms,
            NOISE_PERCENTILE,
        )
    )

    # -----------------------------------------------------
    # Protect against invalid values
    # -----------------------------------------------------

    eps = 1e-8

    signal_rms = max(
        signal_rms,
        eps,
    )

    noise_rms = max(
        noise_rms,
        eps,
    )

    # -----------------------------------------------------
    # Calculate approximate SNR
    # -----------------------------------------------------

    snr_db = (
        20.0
        * np.log10(
            signal_rms
            / noise_rms
        )
    )

    # -----------------------------------------------------
    # Conservative bounds
    # -----------------------------------------------------

    # We don't want the application displaying absurd
    # values such as 134 dB or an artificial 100 dB ceiling.
    #
    # 0–80 dB is more than enough for an MVP quality
    # indicator.
    snr_db = float(
        np.clip(
            snr_db,
            0.0,
            80.0,
        )
    )

    return snr_db


def _calculate_clipping_ratio(
    audio: np.ndarray,
) -> float:
    """
    Calculate the percentage of samples close to the
    maximum normalized amplitude.
    """

    if audio.size == 0:
        return 0.0

    clipping_ratio = float(
        np.mean(
            np.abs(audio) >= 0.99
        )
    )

    return clipping_ratio


def _load_audio_file(audio_path: str) -> tuple[np.ndarray, int]:
    """
    Load an audio file into a mono float32 numpy array and its sample rate.
    Uses a multi-tiered decoding strategy to reliably handle WebM Opus browser
    recordings, WAV, MP3, M4A, and OGG across environments.
    """
    errors = []

    # 1. Faster-Whisper built-in audio decoder (handles WebM, Opus, MP4, etc.)
    try:
        from faster_whisper.audio import decode_audio

        audio_arr = decode_audio(audio_path, sampling_rate=16000)
        if audio_arr is not None and len(audio_arr) > 0:
            return audio_arr.astype(np.float32), 16000
    except Exception as exc:
        errors.append(f"faster_whisper: {exc}")

    # 2. Librosa load
    try:
        return librosa.load(
            audio_path,
            sr=None,
            mono=True,
        )
    except Exception as exc:
        errors.append(f"librosa: {exc}")

    # 3. Soundfile read
    try:
        import soundfile as sf

        data, sr = sf.read(audio_path, dtype="float32")
        if data.ndim > 1:
            data = np.mean(data, axis=1)
        return data, sr
    except Exception as exc:
        errors.append(f"soundfile: {exc}")

    # 4. PyAV direct container decode
    try:
        import av

        container = av.open(audio_path)
        audio_stream = next((s for s in container.streams if s.type == "audio"), None)
        if audio_stream is not None:
            sample_rate = audio_stream.rate or 16000
            resampler = av.AudioResampler(
                format="fltp",
                layout="mono",
                rate=sample_rate,
            )

            frames = []
            for frame in container.decode(audio_stream):
                for resampled_frame in resampler.resample(frame):
                    frames.append(resampled_frame.to_ndarray())
            for resampled_frame in resampler.resample(None):
                frames.append(resampled_frame.to_ndarray())

            container.close()

            if frames:
                audio_arr = np.concatenate(frames, axis=1)
                if audio_arr.ndim > 1:
                    audio_arr = audio_arr[0]
                return audio_arr.astype(np.float32), sample_rate
    except Exception as exc:
        errors.append(f"PyAV: {exc}")

    # 5. FFmpeg CLI subprocess
    try:
        import subprocess

        cmd = [
            "ffmpeg",
            "-nostdin",
            "-threads",
            "0",
            "-i",
            audio_path,
            "-f",
            "f32le",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-",
        ]
        proc = subprocess.run(cmd, capture_output=True, check=True)
        audio_arr = np.frombuffer(proc.stdout, dtype=np.float32)
        if audio_arr.size > 0:
            return audio_arr, 16000
    except Exception as exc:
        errors.append(f"ffmpeg: {exc}")

    raise RuntimeError(" | ".join(errors))


def check_audio_quality(
    audio_path: str,
) -> QualityResult:
    """
    Evaluate audio against technical quality thresholds.

    Checks:
    1. Audio can be decoded.
    2. Duration is acceptable.
    3. Clipping is acceptable.
    4. Approximate SNR is acceptable.

    IMPORTANT:

    A failed quality check means that the recording
    may not be reliable enough for speech analysis.

    It MUST NOT be interpreted as cognitive decline.
    """

    # =====================================================
    # Load audio
    # =====================================================

    try:
        audio, sample_rate = _load_audio_file(audio_path)
    except Exception as exc:

        return QualityResult(
            passed=False,
            duration_seconds=0.0,
            snr_db=0.0,
            clipping_ratio=0.0,
            reason=(
                "Unable to decode audio: "
                f"{exc}"
            ),
        )

    # =====================================================
    # Empty / invalid audio
    # =====================================================

    if (
        audio.size == 0
        or sample_rate <= 0
    ):

        return QualityResult(
            passed=False,
            duration_seconds=0.0,
            snr_db=0.0,
            clipping_ratio=0.0,
            reason="Audio file is empty",
        )

    # =====================================================
    # Duration
    # =====================================================

    duration = (
        len(audio)
        / sample_rate
    )

    if duration < MIN_DURATION_SECONDS:

        return QualityResult(
            passed=False,
            duration_seconds=duration,
            snr_db=0.0,
            clipping_ratio=0.0,
            reason=(
                f"Audio is too short "
                f"({duration:.2f}s)"
            ),
        )

    if duration > MAX_DURATION_SECONDS:

        return QualityResult(
            passed=False,
            duration_seconds=duration,
            snr_db=0.0,
            clipping_ratio=0.0,
            reason=(
                f"Audio is too long "
                f"({duration:.2f}s)"
            ),
        )

    # =====================================================
    # Clean numerical values
    # =====================================================

    audio = np.asarray(
        audio,
        dtype=np.float32,
    )

    audio = np.nan_to_num(
        audio,
        nan=0.0,
        posinf=0.0,
        neginf=0.0,
    )

    # =====================================================
    # Clipping
    # =====================================================

    clipping_ratio = (
        _calculate_clipping_ratio(
            audio
        )
    )

    if (
        clipping_ratio
        > MAX_CLIPPING_RATIO
    ):

        return QualityResult(
            passed=False,
            duration_seconds=duration,
            snr_db=0.0,
            clipping_ratio=clipping_ratio,
            reason=(
                "Excessive audio clipping"
            ),
        )

    # =====================================================
    # Approximate SNR
    # =====================================================

    snr_db = _estimate_snr(
        audio
    )

    if snr_db < MIN_SNR_DB:

        return QualityResult(
            passed=False,
            duration_seconds=duration,
            snr_db=snr_db,
            clipping_ratio=clipping_ratio,
            reason=(
                f"Audio quality is too low "
                f"(estimated SNR "
                f"{snr_db:.2f} dB)"
            ),
        )

    # =====================================================
    # Passed
    # =====================================================

    return QualityResult(
        passed=True,
        duration_seconds=duration,
        snr_db=snr_db,
        clipping_ratio=clipping_ratio,
        reason=None,
    )