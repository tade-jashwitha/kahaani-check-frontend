-- ============================================================
-- Kahaani-Check
-- Migration 0002: Row Level Security
-- ============================================================

-- Enable RLS
alter table public.users enable row level security;
alter table public.elders enable row level security;
alter table public.consents enable row level security;


-- ============================================================
-- USERS
-- A caregiver can read and update their own application profile.
-- ============================================================

create policy "caregivers can view own profile"
on public.users
for select
to authenticated
using (id = auth.uid());

create policy "caregivers can update own profile"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());


-- ============================================================
-- ELDERS
-- A caregiver can access only elders belonging to them.
-- ============================================================

create policy "caregivers can view own elders"
on public.elders
for select
to authenticated
using (caregiver_id = auth.uid());

create policy "caregivers can create own elders"
on public.elders
for insert
to authenticated
with check (caregiver_id = auth.uid());

create policy "caregivers can update own elders"
on public.elders
for update
to authenticated
using (caregiver_id = auth.uid())
with check (caregiver_id = auth.uid());

create policy "caregivers can delete own elders"
on public.elders
for delete
to authenticated
using (caregiver_id = auth.uid());


-- ============================================================
-- CONSENTS
-- A caregiver can access consent records only for their elders.
-- ============================================================

create policy "caregivers can view own elder consents"
on public.consents
for select
to authenticated
using (
    exists (
        select 1
        from public.elders e
        where e.id = consents.elder_id
          and e.caregiver_id = auth.uid()
    )
);

create policy "caregivers can create own elder consents"
on public.consents
for insert
to authenticated
with check (
    exists (
        select 1
        from public.elders e
        where e.id = consents.elder_id
          and e.caregiver_id = auth.uid()
    )
);

create policy "caregivers can update own elder consents"
on public.consents
for update
to authenticated
using (
    exists (
        select 1
        from public.elders e
        where e.id = consents.elder_id
          and e.caregiver_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from public.elders e
        where e.id = consents.elder_id
          and e.caregiver_id = auth.uid()
    )
);