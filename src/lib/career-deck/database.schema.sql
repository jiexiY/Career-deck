create table sources (
  id text primary key,
  name text not null,
  homepage text not null,
  adapter_key text not null unique,
  category text not null,
  status text not null check (status in ('active', 'blocked', 'manual_review_required', 'paused')),
  robots_policy text not null check (robots_policy in ('allowed', 'restricted', 'unknown')),
  last_attempt_at timestamptz not null,
  last_failure_reason text,
  owner text not null
);

create table fetch_attempts (
  id text primary key,
  source_id text not null references sources(id),
  attempted_at timestamptz not null,
  status text not null check (status in ('success', 'blocked', 'manual_review_required', 'failed')),
  reason text,
  records_seen integer not null default 0,
  records_saved integer not null default 0
);

create table opportunities (
  id text primary key,
  title text not null,
  organization text not null,
  type text not null,
  status text not null check (status in ('open', 'changed', 'closed', 'removed')),
  source_id text not null references sources(id),
  location text not null,
  deadline date not null,
  compensation text not null,
  eligibility text not null,
  url text not null,
  discovered_at timestamptz not null,
  updated_at timestamptz not null,
  source_confidence numeric(4, 3) not null,
  extraction_confidence numeric(4, 3) not null,
  freshness_score numeric(4, 3) not null,
  duplicate_probability numeric(4, 3) not null,
  evidence jsonb not null default '[]',
  needs_review boolean not null default false
);

create table manual_review_items (
  id text primary key,
  opportunity_id text references opportunities(id),
  source_id text not null references sources(id),
  status text not null check (status in ('pending', 'approved', 'rejected', 'merged')),
  reason text not null,
  queued_at timestamptz not null,
  fields jsonb not null default '{}',
  attachments jsonb not null default '[]',
  ai_extraction_override text,
  duplicate_of text references opportunities(id)
);

create table daily_reports (
  id text primary key,
  report_date date not null unique,
  week text not null,
  previous_report_date date not null,
  previous_report_week text not null,
  generated_from text not null check (generated_from = 'database'),
  changes jsonb not null
);

create index fetch_attempts_source_time_idx on fetch_attempts (source_id, attempted_at desc);
create index opportunities_type_status_idx on opportunities (type, status);
create index opportunities_deadline_idx on opportunities (deadline);
create index manual_review_status_idx on manual_review_items (status, queued_at desc);
