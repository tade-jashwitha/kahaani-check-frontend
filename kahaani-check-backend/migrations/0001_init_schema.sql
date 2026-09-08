-- Kahaani-Check
-- Migration 0001: identity, elders, and consent
--
-- This migration intentionally contains only the tables needed
-- for MVP Step 1. Pipeline tables will be added in later migrations.

create extension if not exists pgcrypto;


-- ============================================================
-- ENUM TYPES
-- ============================================================

create type public.user_role as enum (
    'caregiver'
);

create type public.elder_status as enum (
    'active',
    'paused',
    'archived'
);

create type public.consent_type as enum (
    'participation',
    'recording',
    'retention_extended'
);

create type public.consent_status as enum (
    'granted',
    'declined',
    'withdrawn'
);

create type public.consent_captured_via as enum (
    'ivr_dtmf',
    'ivr_voice',
    'web'
);


-- ============================================================
-- USERS
-- Application-level caregiver profile.
--
-- The id is the same UUID as auth.users.id.
-- Supabase Auth owns authentication; this table owns
-- Kahaani-Check application profile information.
-- ============================================================

create table public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    role public.user_role not null default 'caregiver',
    created_at timestamptz not null default now()
);


-- ============================================================
-- ELDERS
-- Each elder belongs to exactly one caregiver.
-- ============================================================

create table public.elders (
    id uuid primary key default gen_random_uuid(),

    caregiver_id uuid not null
        references public.users(id) on delete cascade,

    display_name text not null,

    phone_e164 text not null,

    preferred_call_language text not null default 'hi',

    dob_year_range text,

    timezone text not null default 'Asia/Kolkata',

    status public.elder_status not null default 'active',

    created_at timestamptz not null default now()
);


-- ============================================================
-- CONSENTS
-- Consent events belong to an elder.
--
-- We keep each event rather than overwriting one row so that
-- consent history remains auditable.
-- ============================================================

create table public.consents (
    id uuid primary key default gen_random_uuid(),

    elder_id uuid not null
        references public.elders(id) on delete cascade,

    consent_type public.consent_type not null,

    status public.consent_status not null,

    captured_via public.consent_captured_via not null,

    captured_at timestamptz not null default now(),

    expires_at timestamptz
);


-- ============================================================
-- INDEXES
-- ============================================================

create index elders_caregiver_id_idx
    on public.elders(caregiver_id);

create index consents_elder_id_idx
    on public.consents(elder_id);

create index consents_elder_type_captured_at_idx
    on public.consents(elder_id, consent_type, captured_at desc);