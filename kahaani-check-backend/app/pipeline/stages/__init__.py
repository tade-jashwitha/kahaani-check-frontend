# Pipeline stages package
#
# Each stage represents one discrete, independently testable step
# in the Kahaani-Check audio processing pipeline.
#
# Stages (in execution order):
#   quality_stage       — audio quality gate (SNR, clipping, duration)
#   transcription_stage — Whisper STT → transcript + segments
#   sufficiency_stage   — speech sufficiency gate (duration, ratio, word count)
#   feature_stage       — acoustic / linguistic feature extraction
