# Kahaani-Check Repository Layer
#
# All Supabase data-access calls live here, grouped by domain.
# Nothing in this layer contains business logic.
# Services import from repositories; routers never touch repositories directly.
#
# Repositories:
#   elder_repo      — elders table
#   checkin_repo    — check_ins table
#   consent_repo    — consents / elder_consents tables
#   schedule_repo   — weekly_schedules table
#   trajectory_repo — trajectory_results table
#   baseline_repo   — baselines + speech_features tables
