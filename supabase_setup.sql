-- ╔══════════════════════════════════════════╗
-- ║   AJ EDITS — Supabase Table Setup SQL   ║
-- ║   Run this in: supabase.com → SQL Editor ║
-- ╚══════════════════════════════════════════╝

-- 1. Users
create table if not exists aj_users (
  id text primary key,
  name text,
  email text unique,
  password text,
  role text default 'client',
  joined text,
  avatar text
);

-- 2. Bookings
create table if not exists aj_bookings (
  id text primary key,
  user_id text,
  client_name text,
  client_email text,
  service text,
  description text,
  drive_link text,
  phone text,
  contact_note text,
  file_name text,
  img_name text,
  price integer default 0,
  status text default 'Pending Payment',
  delivery_url text,
  delivery_note text,
  reject_reason text,
  cancelled_at text,
  created_at text
);

-- 3. Payments
create table if not exists aj_payments (
  id text primary key,
  booking_id text,
  user_id text,
  amount integer default 0,
  status text default 'Pending',
  created_at text
);

-- 4. Samples
create table if not exists aj_samples (
  id text primary key,
  title text,
  type text,
  thumb text,
  added_on text
);

-- 5. Reviews
create table if not exists aj_reviews (
  id text primary key,
  name text,
  service text,
  rating integer default 5,
  text text,
  date text,
  avatar text
);

-- 6. Notifications
create table if not exists aj_notifications (
  id text primary key,
  type text,
  title text,
  message text,
  booking_id text,
  client_name text,
  service text,
  price integer,
  date text,
  read boolean default false
);

-- 7. Allow public access (since we use anon key)
alter table aj_users enable row level security;
alter table aj_bookings enable row level security;
alter table aj_payments enable row level security;
alter table aj_samples enable row level security;
alter table aj_reviews enable row level security;
alter table aj_notifications enable row level security;

create policy "public_all" on aj_users for all using (true) with check (true);
create policy "public_all" on aj_bookings for all using (true) with check (true);
create policy "public_all" on aj_payments for all using (true) with check (true);
create policy "public_all" on aj_samples for all using (true) with check (true);
create policy "public_all" on aj_reviews for all using (true) with check (true);
create policy "public_all" on aj_notifications for all using (true) with check (true);
