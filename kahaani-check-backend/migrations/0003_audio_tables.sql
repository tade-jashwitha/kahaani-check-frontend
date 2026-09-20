-- ============================================================
-- Kahaani-Check
-- Migration 0003: Check-ins, Audio Recordings, Transcripts, Baselines & Trajectories
-- ============================================================

-- Check-in statuses
do $$
begin
    if not exists (select 1 from pg_type where typname = 'checkin_status') then
        create type public.checkin_status as enum (
            'scheduled',
            'initiated',
            'completed',
            'failed',
            'technical_failure'
        );
    end if;
end$$;

-- Audio quality statuses
do $$
begin
    if not exists (select 1 from pg_type where typname = 'quality_status') then
        create type public.quality_status as enum (
            'processing',
            'passed',
            'rejected',
            'failed'
        );
    end if;
end$$;


-- ============================================================
-- SCHEDULES
-- Regular recurring weekly check-in configuration for an elder.
-- ============================================================

create table if not exists public.schedules (
    id uuid primary key default gen_random_uuid(),
    elder_id uuid not null references public.elders(id) on delete cascade,
    day_of_week integer not null check (day_of_week between 0 and 6),
    time_of_day text not null,
    enabled boolean not null default true,
    timezone text not null default 'Asia/Kolkata',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists schedules_elder_id_idx
    on public.schedules(elder_id);


-- ============================================================
-- CALL RECORDINGS
-- Audio file metadata and quality validation outputs.
-- ============================================================

create table if not exists public.call_recordings (
    id uuid primary key default gen_random_uuid(),
    elder_id uuid not null references public.elders(id) on delete cascade,
    storage_path text not null,
    original_filename text,
    duration_seconds double precision,
    sample_rate integer,
    channels integer,
    quality_status text not null default 'processing',
    quality_reason text,
    created_at timestamptz not null default now()
);

create index if not exists call_recordings_elder_id_idx
    on public.call_recordings(elder_id);


-- ============================================================
-- CHECK-INS
-- Weekly touchpoints linking schedules, calls, and analysis.
-- ============================================================

create table if not exists public.check_ins (
    id uuid primary key default gen_random_uuid(),
    elder_id uuid not null references public.elders(id) on delete cascade,
    call_id uuid references public.call_recordings(id) on delete set null,
    status text not null default 'scheduled',
    scheduled_for timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists check_ins_elder_id_idx
    on public.check_ins(elder_id);

create index if not exists check_ins_scheduled_for_idx
    on public.check_ins(scheduled_for);


-- ============================================================
-- TRANSCRIPTS
-- Automatic Speech Recognition outputs (Whisper STT).
-- ============================================================

create table if not exists public.transcripts (
    id uuid primary key default gen_random_uuid(),
    call_recording_id uuid not null references public.call_recordings(id) on delete cascade,
    text text not null,
    language text not null default 'hi',
    model_name text not null default 'tiny',
    confidence double precision,
    created_at timestamptz not null default now()
);

create index if not exists transcripts_call_recording_id_idx
    on public.transcripts(call_recording_id);


-- ============================================================
-- BASELINES
-- Frozen calibration reference metrics computed from n >= 3 check-ins.
-- ============================================================

create table if not exists public.baselines (
    id uuid primary key default gen_random_uuid(),
    elder_id uuid not null unique references public.elders(id) on delete cascade,
    sample_count integer not null default 3,
    speaking_rate_mean double precision not null,
    speaking_rate_stddev double precision not null,
    pause_density_mean double precision not null,
    pause_density_stddev double precision not null,
    lexical_diversity_mean double precision not null,
    lexical_diversity_stddev double precision not null,
    created_at timestamptz not null default now()
);

create index if not exists baselines_elder_id_idx
    on public.baselines(elder_id);


-- ============================================================
-- TRAJECTORY RESULTS
-- Longitudinal statistical deviation scoring (Z-Scores).
-- ============================================================

create table if not exists public.trajectory_results (
    id uuid primary key default gen_random_uuid(),
    elder_id uuid not null references public.elders(id) on delete cascade,
    call_recording_id uuid not null references public.call_recordings(id) on delete cascade,
    baseline_id uuid not null references public.baselines(id) on delete cascade,
    overall_status text not null,
    speaking_rate_z_score double precision,
    speaking_rate_status text,
    pause_density_z_score double precision,
    pause_density_status text,
    lexical_diversity_z_score double precision,
    lexical_diversity_status text,
    created_at timestamptz not null default now()
);

create index if not exists trajectory_results_elder_id_idx
    on public.trajectory_results(elder_id);

create index if not exists trajectory_results_call_recording_id_idx
    on public.trajectory_results(call_recording_id);


-- ============================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================

alter table public.schedules enable row level security;
alter table public.call_recordings enable row level security;
alter table public.check_ins enable row level security;
alter table public.transcripts enable row level security;
alter table public.baselines enable row level security;
alter table public.trajectory_results enable row level security;

-- Schedules
create policy "caregivers can manage schedules for own elders"
on public.schedules for all to authenticated
using (exists (select 1 from public.elders e where e.id = schedules.elder_id and e.caregiver_id = auth.uid()))
with check (exists (select 1 from public.elders e where e.id = schedules.elder_id and e.caregiver_id = auth.uid()));

-- Call Recordings
create policy "caregivers can view recordings for own elders"
on public.call_recordings for select to authenticated
using (exists (select 1 from public.elders e where e.id = call_recordings.elder_id and e.caregiver_id = auth.uid()));

-- Check-ins
create policy "caregivers can manage check-ins for own elders"
on public.check_ins for all to authenticated
using (exists (select 1 from public.elders e where e.id = check_ins.elder_id and e.caregiver_id = auth.uid()))
with check (exists (select 1 from public.elders e where e.id = check_ins.elder_id and e.caregiver_id = auth.uid()));

-- Transcripts
create policy "caregivers can view transcripts for own elder recordings"
on public.transcripts for select to authenticated
using (exists (
    select 1 from public.call_recordings cr
    join public.elders e on e.id = cr.elder_id
    where cr.id = transcripts.call_recording_id and e.caregiver_id = auth.uid()
));

-- Baselines
create policy "caregivers can view baselines for own elders"
on public.baselines for select to authenticated
using (exists (select 1 from public.elders e where e.id = baselines.elder_id and e.caregiver_id = auth.uid()));

-- Trajectory Results
create policy "caregivers can view trajectory results for own elders"
on public.trajectory_results for select to authenticated
using (exists (select 1 from public.elders e where e.id = trajectory_results.elder_id and e.caregiver_id = auth.uid()));
