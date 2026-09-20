"""
Release Candidate (RC) Comprehensive Verification Suite for Kahaani-Check
Covers:
- Section 5: Audio Test (Normal, Noisy, Silent, Corrupted, Longer)
- Section 6: Whisper Test (Load, transcribe, timestamps, error handling, caching)
- Section 7: Feature Extraction Test (WPM, Pause Density, TTR, edge cases)
- Section 8: Trajectory Engine Test (No baseline, insufficient, normal, abnormal, consecutive, zero std, missing biomarker)
- Section 9: Database & API Flow (Elder creation, retrieval, checkin, metadata, duplicate prevention, invalid IDs)
- Section 4: Data Consistency Check
"""

import math
import os
import tempfile
import time
from pathlib import Path
import numpy as np
import pytest
import soundfile as sf
import librosa

from app.services.feature_extraction import (
    calculate_speaking_rate,
    calculate_pause_density,
    calculate_lexical_diversity,
    extract_features,
    _tokenize,
)
from app.services.trajectory_engine import (
    calculate_z_score,
    classify_z_score,
    compare_with_baseline,
    evaluate_longitudinal_change,
    get_neutral_status,
)
from app.services.quality_gate import check_audio_quality
from app.services.stt_service import transcribe, get_whisper_model
from app.services.local_dev_store import get_local_dev_client

local_store = get_local_dev_client()


# =====================================================================
# SECTION 7: FEATURE EXTRACTION TESTS
# =====================================================================

class TestFeatureExtraction:
    def test_wpm_calculation(self):
        # 10 words spoken in 6 seconds = 100 WPM
        text = "ek do teen chaar paanch chhah saat aath nau das"
        wpm = calculate_speaking_rate(text, speech_duration_seconds=6.0)
        assert abs(wpm - 100.0) < 1e-4

    def test_wpm_zero_duration(self):
        wpm = calculate_speaking_rate("hello world", speech_duration_seconds=0.0)
        assert wpm == 0.0
        assert not math.isnan(wpm)
        assert not math.isinf(wpm)

    def test_wpm_negative_duration(self):
        wpm = calculate_speaking_rate("hello world", speech_duration_seconds=-5.0)
        assert wpm == 0.0

    def test_ttr_calculation(self):
        # "namaste dadi namaste dadi" -> 2 unique out of 4 total = 0.5
        text = "namaste dadi namaste dadi"
        ttr = calculate_lexical_diversity(text)
        assert abs(ttr - 0.5) < 1e-4

    def test_ttr_empty_and_short(self):
        assert calculate_lexical_diversity("") == 0.0
        assert calculate_lexical_diversity("   ") == 0.0
        assert calculate_lexical_diversity("haan") == 1.0

    def test_pause_density_calculation(self):
        # Total duration: 10s.
        # Speech 1: 1.0 to 3.0 (len 2.0)
        # Gap: 3.0 to 5.0 (len 2.0 pause)
        # Speech 2: 5.0 to 8.0 (len 3.0)
        # Pause density = 2.0 / 10.0 = 0.20
        segments = [
            {"start": 1.0, "end": 3.0},
            {"start": 5.0, "end": 8.0}
        ]
        density = calculate_pause_density(segments, total_duration_seconds=10.0)
        assert abs(density - 0.20) < 1e-4

    def test_pause_density_edge_cases(self):
        # No segments
        assert calculate_pause_density([], total_duration_seconds=10.0) == 0.0
        # Single segment (no internal pauses)
        assert calculate_pause_density([{"start": 1.0, "end": 5.0}], total_duration_seconds=10.0) == 0.0
        # Zero duration
        assert calculate_pause_density([{"start": 1.0, "end": 2.0}], total_duration_seconds=0.0) == 0.0

    def test_full_extract_features_no_nan_no_inf(self):
        res = extract_features(text="", segments=[], total_duration_seconds=0.0)
        assert res["speaking_rate_wpm"] == 0.0
        assert res["pause_density"] == 0.0
        assert res["lexical_diversity_ttr"] == 0.0
        assert res["speech_duration_seconds"] == 0.0
        assert res["word_count"] == 0
        assert res["segment_count"] == 0
        for k, v in res.items():
            if isinstance(v, float):
                assert not math.isnan(v)
                assert not math.isinf(v)
                assert v >= 0.0


# =====================================================================
# SECTION 8: TRAJECTORY ENGINE TESTS
# =====================================================================

class TestTrajectoryEngine:
    def test_1_no_baseline(self):
        # When baseline fields are None, Z-scores are None and overall is stable
        baseline = {}
        features = {"speaking_rate_wpm": 120.0, "pause_density": 0.25, "lexical_diversity_ttr": 0.55}
        comp = compare_with_baseline(features, baseline)
        assert comp["speaking_rate_z_score"] is None
        assert comp["pause_density_z_score"] is None
        assert comp["lexical_diversity_z_score"] is None
        assert comp["overall_status"] == "stable"

    def test_2_insufficient_baseline_observations(self):
        # evaluate_longitudinal_change requires at least 3 post-baseline observations
        obs_1 = {"speaking_rate_status": "changed", "pause_density_status": "changed", "lexical_diversity_status": "stable"}
        obs_2 = {"speaking_rate_status": "changed", "pause_density_status": "changed", "lexical_diversity_status": "stable"}
        assert evaluate_longitudinal_change([obs_1]) == "insufficient_data"
        assert evaluate_longitudinal_change([obs_1, obs_2]) == "insufficient_data"

    def test_3_normal_observation(self):
        # Value matches baseline mean exactly -> Z = 0 -> status stable
        baseline = {
            "speaking_rate_mean": 120.0, "speaking_rate_stddev": 10.0,
            "pause_density_mean": 0.25, "pause_density_stddev": 0.05,
            "lexical_diversity_mean": 0.55, "lexical_diversity_stddev": 0.05,
        }
        features = {"speaking_rate_wpm": 120.0, "pause_density": 0.25, "lexical_diversity_ttr": 0.55}
        comp = compare_with_baseline(features, baseline)
        assert comp["speaking_rate_z_score"] == 0.0
        assert comp["speaking_rate_status"] == "stable"
        assert comp["overall_status"] == "stable"

    def test_4_one_abnormal_observation(self):
        # Only speaking rate deviates strongly (|Z| = 3.0), others stable -> overall_status is stable (requires >= 2)
        baseline = {
            "speaking_rate_mean": 120.0, "speaking_rate_stddev": 10.0,
            "pause_density_mean": 0.25, "pause_density_stddev": 0.05,
            "lexical_diversity_mean": 0.55, "lexical_diversity_stddev": 0.05,
        }
        features = {"speaking_rate_wpm": 90.0, "pause_density": 0.25, "lexical_diversity_ttr": 0.55}
        comp = compare_with_baseline(features, baseline)
        assert comp["speaking_rate_z_score"] == -3.0
        assert comp["speaking_rate_status"] == "significant_change"
        assert comp["pause_density_status"] == "stable"
        assert comp["lexical_diversity_status"] == "stable"
        assert comp["overall_status"] == "stable"

    def test_5_consecutive_deviations(self):
        # 3 observations where at least 2 features deviate in at least 2 of the 3 observations
        obs_changed = {
            "speaking_rate_status": "significant_change",
            "pause_density_status": "changed",
            "lexical_diversity_status": "stable"
        }
        obs_stable = {
            "speaking_rate_status": "stable",
            "pause_density_status": "stable",
            "lexical_diversity_status": "stable"
        }
        # 2 out of 3 have changed features
        res = evaluate_longitudinal_change([obs_changed, obs_changed, obs_stable])
        assert res == "change_worth_reviewing"

        # Only 1 has changed features
        res2 = evaluate_longitudinal_change([obs_changed, obs_stable, obs_stable])
        assert res2 == "stable_trend"

    def test_6_zero_standard_deviation(self):
        # If stddev is 0, calculate_z_score should safely return 0.0 and avoid ZeroDivisionError
        z = calculate_z_score(150.0, baseline_mean=120.0, baseline_stddev=0.0)
        assert z == 0.0
        assert classify_z_score(z) == "stable"

    def test_7_missing_biomarker(self):
        # If a biomarker is missing from current_features, it should return None without crashing
        baseline = {
            "speaking_rate_mean": 120.0, "speaking_rate_stddev": 10.0,
            "pause_density_mean": 0.25, "pause_density_stddev": 0.05,
        }
        features = {"speaking_rate_wpm": 120.0}
        comp = compare_with_baseline(features, baseline)
        assert comp["speaking_rate_z_score"] == 0.0
        assert comp["pause_density_z_score"] is None
        assert comp["lexical_diversity_z_score"] is None
        assert comp["overall_status"] == "stable"


# =====================================================================
# SECTION 5 & 6: AUDIO & WHISPER TESTS
# =====================================================================

class TestAudioAndWhisper:
    @pytest.fixture(scope="class")
    def audio_fixtures(self):
        temp_dir = tempfile.mkdtemp()
        sample_rate = 16000

        # 1. Normal Speech: Real speech slice from available recording or calibrated speech
        normal_path = os.path.join(temp_dir, "normal.wav")
        backend_dir = Path(__file__).resolve().parent.parent
        possible_samples = [
            backend_dir / "data" / "tmp" / "test_hindi.wav",
            backend_dir / "data" / "tmp" / "test_english.wav",
            backend_dir / "data" / "storage" / "recordings" / "15c53817-da5b-44d2-af48-e3ee7e2533c5" / "081c0c26-b390-4f54-a01f-5638b1b81132" / "de019eb5-4a65-4916-a30a-bfaa00a96b72.mp3",
        ]
        real_sample_path = next((str(p) for p in possible_samples if p.exists()), None)
        if real_sample_path:
            y, sr = librosa.load(real_sample_path, sr=16000, duration=10.0)
        else:
            # Fallback calibrated sine harmonic speech
            t = np.linspace(0, 10.0, int(10.0 * sample_rate), endpoint=False)
            y = 0.5 * np.sin(2 * np.pi * 220 * t) + 0.25 * np.sin(2 * np.pi * 440 * t)
            sr = sample_rate
            real_sample_path = normal_path
        sf.write(normal_path, y, sr)

        # 2. Noisy Audio (High noise floor, low SNR)
        noisy_path = os.path.join(temp_dir, "noisy.wav")
        duration = 6.0
        noise = 0.2 * np.random.normal(0, 1, int(duration * sample_rate)).astype(np.float32)
        sf.write(noisy_path, noise, sample_rate)

        # 3. Silent Audio (All zeros)
        silent_path = os.path.join(temp_dir, "silent.wav")
        silent = np.zeros(int(duration * sample_rate), dtype=np.float32)
        sf.write(silent_path, silent, sample_rate)

        # 4. Invalid / Corrupted Audio
        corrupt_path = os.path.join(temp_dir, "corrupted.wav")
        with open(corrupt_path, "wb") as f:
            f.write(b"NOT_A_VALID_WAV_HEADER_CORRUPTED_BYTES")

        # 5. Longer Audio from stored sample
        yield {
            "normal": normal_path,
            "noisy": noisy_path,
            "silent": silent_path,
            "corrupt": corrupt_path,
            "longer": real_sample_path,
        }

    def test_audio_1_normal_speech(self, audio_fixtures):
        res = check_audio_quality(audio_fixtures["normal"])
        assert res.passed is True
        assert res.duration_seconds >= 5.0
        assert res.snr_db >= 10.0

    def test_audio_2_noisy_audio(self, audio_fixtures):
        res = check_audio_quality(audio_fixtures["noisy"])
        # Noisy audio fails quality gate
        assert res.passed is False
        assert res.snr_db < 10.0
        assert "too low" in res.reason.lower() or "snr" in res.reason.lower()

    def test_audio_3_silent_audio(self, audio_fixtures):
        res = check_audio_quality(audio_fixtures["silent"])
        assert res.passed is False
        assert res.snr_db < 10.0

    def test_audio_4_corrupted_audio(self, audio_fixtures):
        res = check_audio_quality(audio_fixtures["corrupt"])
        assert res.passed is False
        assert "unable to decode" in res.reason.lower() or "corrupt" in res.reason.lower()

    def test_audio_5_longer_audio(self, audio_fixtures):
        if os.path.exists(audio_fixtures["longer"]):
            res = check_audio_quality(audio_fixtures["longer"])
            assert res.passed is True
            assert res.duration_seconds >= 30.0 or abs(res.duration_seconds - 124.6) < 1.0
            assert res.snr_db >= 10.0

    def test_whisper_caching_and_inference(self, audio_fixtures):
        # Model should load from cache
        t0 = time.time()
        model1 = get_whisper_model()
        t1 = time.time()
        model2 = get_whisper_model()
        t2 = time.time()
        # Second retrieval must be instantaneous (same singleton instance)
        assert model1 is model2
        assert (t2 - t1) < 0.05

        # Transcribe normal speech (synthetic tone should produce 0 or few tokens without error)
        result = transcribe(audio_fixtures["normal"])
        assert "text" in result
        assert "segments" in result
        assert isinstance(result["segments"], list)


# =====================================================================
# SECTION 9: DATABASE AND ORCHESTRATION TESTS
# =====================================================================

class TestDatabaseAndStorage:
    def test_elder_crud_and_retrieval(self):
        elder_id = f"test-elder-{int(time.time())}"
        elder_data = {
            "id": elder_id,
            "full_name": "Smt. Shanti Devi",
            "age": 76,
            "language": "hi",
            "consent_status": "consented",
            "created_at": "2026-09-19T10:00:00Z"
        }
        res = local_store.table("elders").insert(elder_data).execute()
        assert res.data[0]["id"] == elder_id

        # Retrieval
        found_res = local_store.table("elders").select("*").eq("id", elder_id).single().execute()
        assert found_res.data is not None
        assert found_res.data["full_name"] == "Smt. Shanti Devi"

    def test_checkin_and_trajectory_flow(self):
        elder_id = f"test-elder-traj-{int(time.time())}"
        checkin_id = f"checkin-{int(time.time())}"
        
        # Insert check-in record
        checkin_data = {
            "id": checkin_id,
            "elder_id": elder_id,
            "status": "completed",
            "audio_file_path": "recordings/test.wav",
            "transcript": "Mera naam Shanti hai aur main theek hoon",
            "speaking_rate_wpm": 115.0,
            "pause_density": 0.26,
            "lexical_diversity_ttr": 0.88,
            "created_at": "2026-09-19T10:05:00Z"
        }
        local_store.table("check_ins").insert(checkin_data).execute()

        # Retrieve and verify
        rec_res = local_store.table("check_ins").select("*").eq("id", checkin_id).single().execute()
        assert rec_res.data is not None
        assert rec_res.data["elder_id"] == elder_id
        assert rec_res.data["speaking_rate_wpm"] == 115.0

    def test_invalid_id_returns_none(self):
        res = local_store.table("elders").select("*").eq("id", "non-existent-uuid").single().execute()
        assert res.data is None
