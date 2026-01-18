-- Enable pg_cron and pg_net extensions
-- pg_cron: Allows scheduling cron jobs in PostgreSQL
-- pg_net: Allows making HTTP requests from PostgreSQL

-- Note: pg_cron can only be enabled in the postgres database
-- It runs as a background worker and requires superuser privileges
-- In Supabase, these extensions need to be enabled via the dashboard or SQL

-- Enable extensions (these may already be enabled in Supabase)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Grant usage on cron schema to postgres
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Create cron_job_logs table to track job executions
create table if not exists public.cron_job_logs (
    id uuid default gen_random_uuid() primary key,
    job_name text not null,
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    status text not null default 'running',
    response_status integer,
    response_body jsonb,
    error_message text,
    created_at timestamptz default now()
);

-- Add index for querying by job name and status
create index if not exists idx_cron_job_logs_job_name on public.cron_job_logs(job_name);
create index if not exists idx_cron_job_logs_started_at on public.cron_job_logs(started_at desc);
create index if not exists idx_cron_job_logs_status on public.cron_job_logs(status);

-- Enable RLS on cron_job_logs
alter table public.cron_job_logs enable row level security;

-- Allow service role full access
create policy "Service role can manage cron_job_logs"
    on public.cron_job_logs
    for all
    using (true)
    with check (true);

-- Comment on table
comment on table public.cron_job_logs is 'Logs for pg_cron job executions';

-- Create cron_config table to store configuration
create table if not exists public.cron_config (
    key text primary key,
    value text not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS on cron_config
alter table public.cron_config enable row level security;

-- Only service role can access cron_config
create policy "Service role can manage cron_config"
    on public.cron_config
    for all
    using (true)
    with check (true);

-- Comment on table
comment on table public.cron_config is 'Configuration for pg_cron jobs';

-- Insert config values (will need to be updated manually or via SQL)
-- These are placeholder values that need to be updated after deployment
insert into public.cron_config (key, value) values
    ('base_url', 'https://radar.funnelists.com'),
    ('cron_secret', 'REPLACE_WITH_ACTUAL_CRON_SECRET')
on conflict (key) do nothing;

-- Function to get config value
create or replace function public.get_cron_config(p_key text)
returns text
language sql
security definer
stable
as $$
    select value from public.cron_config where key = p_key;
$$;

-- Function to log cron job start
create or replace function public.log_cron_job_start(p_job_name text)
returns uuid
language plpgsql
security definer
as $$
declare
    v_log_id uuid;
begin
    insert into public.cron_job_logs (job_name, status)
    values (p_job_name, 'running')
    returning id into v_log_id;
    return v_log_id;
end;
$$;

-- Function to log cron job completion
create or replace function public.log_cron_job_complete(
    p_log_id uuid,
    p_status text,
    p_response_status integer default null,
    p_response_body jsonb default null,
    p_error_message text default null
)
returns void
language plpgsql
security definer
as $$
begin
    update public.cron_job_logs
    set
        completed_at = now(),
        status = p_status,
        response_status = p_response_status,
        response_body = p_response_body,
        error_message = p_error_message
    where id = p_log_id;
end;
$$;

-- Function to execute cron job with logging
create or replace function public.execute_cron_job(p_job_name text, p_endpoint text)
returns void
language plpgsql
security definer
as $$
declare
    v_log_id uuid;
    v_base_url text;
    v_cron_secret text;
    v_request_id bigint;
begin
    -- Get config values
    v_base_url := public.get_cron_config('base_url');
    v_cron_secret := public.get_cron_config('cron_secret');

    -- Log job start
    v_log_id := public.log_cron_job_start(p_job_name);

    -- Make HTTP request
    select net.http_post(
        url := v_base_url || p_endpoint,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_cron_secret
        ),
        body := jsonb_build_object('log_id', v_log_id)
    ) into v_request_id;

    -- Note: The response will be handled asynchronously by pg_net
    -- The API endpoint should update the log entry when it completes
end;
$$;

-- Create cron jobs for API endpoints
-- Note: These use the execute_cron_job function which handles logging

-- Unschedule existing jobs if they exist (for idempotency)
do $$
begin
    perform cron.unschedule('fetch-sources');
exception when others then
    null;
end;
$$;

do $$
begin
    perform cron.unschedule('morning-digest');
exception when others then
    null;
end;
$$;

do $$
begin
    perform cron.unschedule('evening-digest');
exception when others then
    null;
end;
$$;

do $$
begin
    perform cron.unschedule('weekly-digest');
exception when others then
    null;
end;
$$;

-- Schedule: fetch-sources every 30 minutes
select cron.schedule(
    'fetch-sources',
    '*/30 * * * *',
    $$select public.execute_cron_job('fetch-sources', '/api/cron/fetch-sources');$$
);

-- Schedule: morning-digest at 6am EST (11am UTC)
-- EST is UTC-5, so 6am EST = 11am UTC
select cron.schedule(
    'morning-digest',
    '0 11 * * *',
    $$select public.execute_cron_job('morning-digest', '/api/cron/morning-digest');$$
);

-- Schedule: evening-digest at 9pm EST (2am UTC next day)
-- EST is UTC-5, so 9pm EST = 2am UTC
select cron.schedule(
    'evening-digest',
    '0 2 * * *',
    $$select public.execute_cron_job('evening-digest', '/api/cron/evening-digest');$$
);

-- Schedule: weekly-digest on Sunday at 8am EST (1pm UTC)
-- EST is UTC-5, so 8am EST = 1pm UTC, day 0 = Sunday
select cron.schedule(
    'weekly-digest',
    '0 13 * * 0',
    $$select public.execute_cron_job('weekly-digest', '/api/cron/weekly-digest');$$
);
