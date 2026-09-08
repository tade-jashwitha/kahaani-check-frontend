from app.services.trajectory_engine import compare_with_baseline


baseline = {
    "speaking_rate_mean": 147.11,
    "speaking_rate_stddev": 31.01,

    "pause_density_mean": 0.03199,
    "pause_density_stddev": 0.04166,

    "lexical_diversity_mean": 0.63249,
    "lexical_diversity_stddev": 0.04869,
}


current_features = {
    "speaking_rate_wpm": 120.0,
    "pause_density": 0.07,
    "lexical_diversity_ttr": 0.58,
}


result = compare_with_baseline(
    current_features,
    baseline,
)


print("TRAJECTORY TEST: OK")
print(result)