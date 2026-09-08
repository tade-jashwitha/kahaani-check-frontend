create table if not exists public.speech_features (
    id uuid primary key default gen_random_uuid(),

    call_recording_id uuid not null
        references public.call_recordings(id)
        on delete cascade,

    speaking_rate_wpm double precision,
    pause_density double precision,
    lexical_diversity_ttr double precision,

    speech_duration_seconds double precision,

    created_at timestamptz not null default now()
);

create unique index if not exists
speech_features_call_recording_id_idx
on public.speech_features(call_recording_id);