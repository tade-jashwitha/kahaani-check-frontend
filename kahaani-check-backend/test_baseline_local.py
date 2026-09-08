from statistics import mean, stdev

samples = [
    {
        "name": "1_rec.mp3",
        "speaking_rate_wpm": 152.06,
        "pause_density": 0.0003,
        "lexical_diversity_ttr": 0.6166,
    },
    {
        "name": "2_rec.mp3",
        "speaking_rate_wpm": 170.19,
        "pause_density": 0.0465,
        "lexical_diversity_ttr": 0.5522,
    },
    {
        "name": "3_rec.mp3",
        "speaking_rate_wpm": 162.69,
        "pause_density": 0.1025,
        "lexical_diversity_ttr": 0.6738,
    },
    {
        "name": "4_rec.mp3",
        "speaking_rate_wpm": 97.34,
        "pause_density": 0.0,
        "lexical_diversity_ttr": 0.6804,
    },
    {
        "name": "5_rec.mp3",
        "speaking_rate_wpm": 166.61,
        "pause_density": 0.0699,
        "lexical_diversity_ttr": 0.5960,
    },
    {
        "name": "6_rec.mp3",
        "speaking_rate_wpm": 108.64,
        "pause_density": 0.0047,
        "lexical_diversity_ttr": 0.6792,
    },
    {
        "name": "7_rec.mp3",
        "speaking_rate_wpm": 172.26,
        "pause_density": 0.0,
        "lexical_diversity_ttr": 0.6292,
    },
]


def stats(values):
    return {
        "mean": mean(values),
        "stddev": stdev(values),
    }


speaking_rates = [x["speaking_rate_wpm"] for x in samples]
pause_densities = [x["pause_density"] for x in samples]
lexical_diversities = [x["lexical_diversity_ttr"] for x in samples]


print("=" * 70)
print("KAHAANI-CHECK — LOCAL BASELINE VALIDATION")
print("=" * 70)

print(f"\nSample count: {len(samples)}")

print("\nSpeaking Rate:")
print(stats(speaking_rates))

print("\nPause Density:")
print(stats(pause_densities))

print("\nLexical Diversity:")
print(stats(lexical_diversities))

print("\nNOTE:")
print("These are SYNTHETIC ElevenLabs samples.")
print("They are being used only to validate the baseline calculation.")
print("They must NOT be treated as the elder's clinical/personal baseline.")