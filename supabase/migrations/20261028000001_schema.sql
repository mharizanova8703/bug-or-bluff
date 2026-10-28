-- ============================================================================
-- Bug or Bluff? — schema, RLS and server-side game logic
--
-- Security model
--   * `questions` (holds correct answers) has RLS enabled and NO policies, so
--     neither anon nor authenticated users can ever select it directly.
--   * `rooms` and `players` are world-readable (needed for Realtime) but contain
--     no secrets. `rooms.reveal` stays NULL until the host reveals a round.
--   * `player_secrets` (session tokens) and `answers` are unreadable by clients.
--   * Every write goes through SECURITY DEFINER functions that validate the
--     caller (host = auth.uid(), player = secret token) and use server time.
-- ============================================================================


-- ---------------------------------------------------------------- tables ---

create table if not exists public.questions (
  id           text primary key,
  category     text not null check (category in ('spot-the-bug','cursed-output','bug-or-bluff','ui-monster')),
  text         text not null,
  code         text,
  language     text,
  options      jsonb not null,
  correct_index int  not null,
  explanation  text not null,
  difficulty   text not null check (difficulty in ('easy','medium','hard'))
);

create table if not exists public.rooms (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique,
  host_id              uuid not null references auth.users(id) on delete cascade,
  status               text not null default 'lobby'
                         check (status in ('lobby','question','reveal','finished')),
  question_seconds     int  not null default 20 check (question_seconds in (15,20,30)),
  question_ids         text[] not null,
  current_index        int  not null default -1,
  question_started_at  timestamptz,
  question_ends_at     timestamptz,
  paused               boolean not null default false,
  paused_remaining_ms  int,
  answer_count         int  not null default 0,
  reveal               jsonb,
  stats                jsonb,
  created_at           timestamptz not null default now(),
  expires_at           timestamptz not null default now() + interval '8 hours'
);

create table if not exists public.players (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.rooms(id) on delete cascade,
  nickname       text not null,
  score          int  not null default 0,
  correct_count  int  not null default 0,
  joined_at      timestamptz not null default now()
);
create unique index if not exists players_room_nick_uq on public.players (room_id, lower(nickname));
create index if not exists players_room_idx on public.players (room_id);

create table if not exists public.player_secrets (
  player_id uuid primary key references public.players(id) on delete cascade,
  token     uuid not null default gen_random_uuid()
);

create table if not exists public.answers (
  room_id        uuid not null references public.rooms(id) on delete cascade,
  player_id      uuid not null references public.players(id) on delete cascade,
  question_index int  not null,
  choice         int  not null,
  submitted_at   timestamptz not null default clock_timestamp(),
  is_correct     boolean not null,
  points         int  not null,
  primary key (room_id, player_id, question_index)   -- one answer per player per question
);

-- ------------------------------------------------------------------- RLS ---

alter table public.questions      enable row level security;
alter table public.rooms          enable row level security;
alter table public.players        enable row level security;
alter table public.player_secrets enable row level security;
alter table public.answers        enable row level security;

drop policy if exists "rooms are readable"   on public.rooms;
drop policy if exists "players are readable" on public.players;
create policy "rooms are readable"   on public.rooms   for select using (true);
create policy "players are readable" on public.players for select using (true);
-- No insert/update/delete policies anywhere: all writes happen in functions below.

revoke all on public.questions, public.player_secrets, public.answers from anon, authenticated;
revoke insert, update, delete, truncate on public.rooms, public.players from anon, authenticated;
grant select on public.rooms, public.players to anon, authenticated;

-- -------------------------------------------------------------- realtime ---

do $$ begin
  alter publication supabase_realtime add table public.rooms;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.players;
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------- helpers ---

create or replace function public.server_now()
returns timestamptz language sql stable as $$ select clock_timestamp() $$;

-- Pick 2 questions per category (8 total), shuffled.
create or replace function public._pick_questions()
returns text[] language plpgsql volatile as $$
declare v_ids text[];
begin
  select array_agg(id order by random()) into v_ids
  from (
    select id from (
      select id, row_number() over (partition by category order by random()) as rn
      from public.questions
    ) t where rn <= 2
  ) s;
  if coalesce(array_length(v_ids, 1), 0) < 8 then
    raise exception 'not_enough_questions';
  end if;
  return v_ids;
end $$;

-- Lock + return a room owned by the caller.
create or replace function public._host_room(p_code text)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare v_room public.rooms;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_room from public.rooms
   where code = upper(trim(p_code)) and host_id = auth.uid() for update;
  if not found then raise exception 'forbidden'; end if;
  if v_room.expires_at < now() then raise exception 'room_expired'; end if;
  return v_room;
end $$;

-- Verify a player's secret token. Returns the player row.
create or replace function public._auth_player(p_room_id uuid, p_player_id uuid, p_token uuid)
returns public.players language plpgsql security definer set search_path = public as $$
declare v_player public.players;
begin
  select p.* into v_player
    from public.players p
    join public.player_secrets s on s.player_id = p.id
   where p.id = p_player_id and p.room_id = p_room_id and s.token = p_token;
  if not found then raise exception 'invalid_session'; end if;
  return v_player;
end $$;

-- ----------------------------------------------------------- host actions ---

create or replace function public.create_room(p_seconds int default 20)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare v_room public.rooms; v_code text; v_tries int := 0;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_seconds not in (15, 20, 30) then raise exception 'bad_seconds'; end if;
  -- tidy up this host's old rooms
  delete from public.rooms where host_id = auth.uid() and (expires_at < now() or status = 'finished');
  loop
    -- unambiguous alphabet (no 0/O, 1/I)
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
      into v_code from generate_series(1, 5);
    begin
      insert into public.rooms (code, host_id, question_seconds, question_ids)
      values (v_code, auth.uid(), p_seconds, public._pick_questions())
      returning * into v_room;
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries > 10 then raise; end if;
    end;
  end loop;
  return v_room;
end $$;

create or replace function public.set_question_seconds(p_code text, p_seconds int)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare v_room public.rooms;
begin
  v_room := public._host_room(p_code);
  if v_room.status <> 'lobby' then raise exception 'game_in_progress'; end if;
  if p_seconds not in (15, 20, 30) then raise exception 'bad_seconds'; end if;
  update public.rooms set question_seconds = p_seconds where id = v_room.id returning * into v_room;
  return v_room;
end $$;

-- Starts the game (from lobby) or moves to the next question (from reveal).
-- After the last question the game becomes 'finished' and stats are computed.
create or replace function public.advance_game(p_code text)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare
  v_room public.rooms; v_next int; v_total int; v_stats jsonb; v_trick jsonb;
begin
  v_room := public._host_room(p_code);
  if v_room.status not in ('lobby', 'reveal') then raise exception 'cannot_advance'; end if;
  if v_room.status = 'lobby' and not exists (select 1 from public.players where room_id = v_room.id) then
    raise exception 'no_players';
  end if;

  v_total := array_length(v_room.question_ids, 1);
  v_next  := v_room.current_index + 1;

  if v_next >= v_total then
    -- ---- final stats
    select jsonb_build_object(
             'answers',  count(*),
             'correct',  count(*) filter (where is_correct),
             'accuracy', case when count(*) = 0 then 0
                              else round(100.0 * count(*) filter (where is_correct) / count(*)) end)
      into v_stats from public.answers where room_id = v_room.id;

    select jsonb_build_object(
             'index',       t.question_index,
             'text',        q.text,
             'code',        q.code,
             'language',    q.language,
             'answer',      q.options ->> q.correct_index,
             'correct_pct', t.pct)
      into v_trick
      from (
        select question_index,
               round(100.0 * count(*) filter (where is_correct) / count(*)) as pct
          from public.answers where room_id = v_room.id
         group by question_index
         order by pct asc, question_index asc limit 1) t
      join public.questions q on q.id = v_room.question_ids[t.question_index + 1];

    update public.rooms
       set status = 'finished', paused = false, paused_remaining_ms = null,
           stats = coalesce(v_stats, '{}'::jsonb) || jsonb_build_object('trickiest', v_trick)
     where id = v_room.id returning * into v_room;
  else
    update public.rooms
       set status = 'question',
           current_index = v_next,
           question_started_at = clock_timestamp(),
           question_ends_at = clock_timestamp() + make_interval(secs => v_room.question_seconds),
           paused = false, paused_remaining_ms = null,
           answer_count = 0, reveal = null
     where id = v_room.id returning * into v_room;
  end if;
  return v_room;
end $$;

create or replace function public.pause_room(p_code text)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare v_room public.rooms;
begin
  v_room := public._host_room(p_code);
  if v_room.status <> 'question' or v_room.paused then return v_room; end if;
  update public.rooms
     set paused = true,
         paused_remaining_ms = greatest(0, floor(extract(epoch from (question_ends_at - clock_timestamp())) * 1000))::int
   where id = v_room.id returning * into v_room;
  return v_room;
end $$;

create or replace function public.resume_room(p_code text)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare v_room public.rooms; v_end timestamptz;
begin
  v_room := public._host_room(p_code);
  if v_room.status <> 'question' or not v_room.paused then return v_room; end if;
  v_end := clock_timestamp() + make_interval(secs => v_room.paused_remaining_ms / 1000.0);
  -- shift the start too so the speed bonus ignores the paused period
  update public.rooms
     set paused = false, paused_remaining_ms = null,
         question_ends_at = v_end,
         question_started_at = v_end - make_interval(secs => v_room.question_seconds)
   where id = v_room.id returning * into v_room;
  return v_room;
end $$;

-- Locks the round, applies points to the leaderboard and publishes the answer.
create or replace function public.reveal_answer(p_code text)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare
  v_room public.rooms; v_q public.questions; v_counts jsonb; v_answered int; v_correct int;
begin
  v_room := public._host_room(p_code);
  if v_room.status = 'reveal' then return v_room; end if;      -- idempotent
  if v_room.status <> 'question' then raise exception 'cannot_reveal'; end if;

  select * into v_q from public.questions where id = v_room.question_ids[v_room.current_index + 1];

  update public.players p
     set score = p.score + a.points,
         correct_count = p.correct_count + (case when a.is_correct then 1 else 0 end)
    from public.answers a
   where a.room_id = v_room.id and a.question_index = v_room.current_index and a.player_id = p.id;

  select coalesce(jsonb_agg(coalesce(c.n, 0) order by g.i), '[]'::jsonb)
    into v_counts
    from generate_series(0, jsonb_array_length(v_q.options) - 1) as g(i)
    left join (select choice, count(*) as n from public.answers
                where room_id = v_room.id and question_index = v_room.current_index
                group by choice) c on c.choice = g.i;

  select count(*), count(*) filter (where is_correct) into v_answered, v_correct
    from public.answers where room_id = v_room.id and question_index = v_room.current_index;

  update public.rooms
     set status = 'reveal', paused = false, paused_remaining_ms = null,
         reveal = jsonb_build_object(
           'index', v_room.current_index,
           'correct_index', v_q.correct_index,
           'explanation', v_q.explanation,
           'counts', v_counts,
           'answered', v_answered,
           'correct_total', v_correct)
   where id = v_room.id returning * into v_room;
  return v_room;
end $$;

-- Back to the lobby with a fresh set of questions and zeroed scores.
create or replace function public.restart_game(p_code text)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare v_room public.rooms;
begin
  v_room := public._host_room(p_code);
  delete from public.answers where room_id = v_room.id;
  update public.players set score = 0, correct_count = 0 where room_id = v_room.id;
  update public.rooms
     set status = 'lobby', current_index = -1, question_ids = public._pick_questions(),
         question_started_at = null, question_ends_at = null,
         paused = false, paused_remaining_ms = null,
         answer_count = 0, reveal = null, stats = null,
         expires_at = greatest(expires_at, now() + interval '4 hours')
   where id = v_room.id returning * into v_room;
  return v_room;
end $$;

-- ---------------------------------------------------------- player actions ---

create or replace function public.join_room(p_code text, p_nickname text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_room public.rooms; v_nick text; v_player public.players; v_token uuid;
begin
  select * into v_room from public.rooms where code = upper(trim(p_code));
  if not found then raise exception 'room_not_found'; end if;
  if v_room.expires_at < now() then raise exception 'room_expired'; end if;
  if v_room.status = 'finished' then raise exception 'game_finished'; end if;

  -- strip markup-ish / control characters, collapse whitespace
  v_nick := btrim(regexp_replace(
              regexp_replace(coalesce(p_nickname, ''), '[<>&"''`\\[:cntrl:]]', '', 'g'),
              '\s+', ' ', 'g'));
  if char_length(v_nick) < 2 or char_length(v_nick) > 16 then raise exception 'bad_nickname'; end if;
  if (select count(*) from public.players where room_id = v_room.id) >= 60 then
    raise exception 'room_full';
  end if;

  begin
    insert into public.players (room_id, nickname) values (v_room.id, v_nick) returning * into v_player;
  exception when unique_violation then
    raise exception 'nickname_taken';
  end;
  insert into public.player_secrets (player_id) values (v_player.id) returning token into v_token;

  return jsonb_build_object('player_id', v_player.id, 'token', v_token, 'nickname', v_player.nickname);
end $$;

-- Validates a stored browser session so a refresh never creates a duplicate.
create or replace function public.rejoin_room(p_code text, p_player_id uuid, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room public.rooms; v_player public.players;
begin
  select * into v_room from public.rooms where code = upper(trim(p_code));
  if not found then raise exception 'room_not_found'; end if;
  v_player := public._auth_player(v_room.id, p_player_id, p_token);
  return jsonb_build_object('player_id', v_player.id, 'nickname', v_player.nickname);
end $$;

-- Current question WITHOUT the correct answer (that arrives via rooms.reveal).
create or replace function public.get_current_question(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_room public.rooms; v_q public.questions;
begin
  select * into v_room from public.rooms where code = upper(trim(p_code));
  if not found or v_room.status not in ('question', 'reveal') then return null; end if;
  select * into v_q from public.questions where id = v_room.question_ids[v_room.current_index + 1];
  return jsonb_build_object(
    'index', v_room.current_index,
    'total', array_length(v_room.question_ids, 1),
    'id', v_q.id, 'category', v_q.category, 'text', v_q.text,
    'code', v_q.code, 'language', v_q.language,
    'options', v_q.options, 'difficulty', v_q.difficulty);
end $$;

create or replace function public.submit_answer(p_code text, p_player_id uuid, p_token uuid, p_choice int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_room public.rooms; v_q public.questions; v_now timestamptz := clock_timestamp();
  v_total_ms numeric; v_elapsed_ms numeric; v_correct boolean; v_points int := 0; v_inserted int;
begin
  select * into v_room from public.rooms where code = upper(trim(p_code)) for update;
  if not found then raise exception 'room_not_found'; end if;
  perform public._auth_player(v_room.id, p_player_id, p_token);

  if v_room.status <> 'question' or v_room.paused then raise exception 'round_closed'; end if;
  -- 600 ms grace for network latency; the host's reveal is the real lock
  if v_now > v_room.question_ends_at + interval '600 milliseconds' then raise exception 'round_closed'; end if;

  select * into v_q from public.questions where id = v_room.question_ids[v_room.current_index + 1];
  if p_choice is null or p_choice < 0 or p_choice >= jsonb_array_length(v_q.options) then
    raise exception 'bad_choice';
  end if;

  v_correct := (p_choice = v_q.correct_index);
  if v_correct then
    v_total_ms   := v_room.question_seconds * 1000.0;
    v_elapsed_ms := least(v_total_ms, greatest(0, extract(epoch from (v_now - v_room.question_started_at)) * 1000));
    v_points     := 100 + round(50 * (1 - v_elapsed_ms / v_total_ms))::int;
  end if;

  insert into public.answers (room_id, player_id, question_index, choice, submitted_at, is_correct, points)
  values (v_room.id, p_player_id, v_room.current_index, p_choice, v_now, v_correct, v_points)
  on conflict (room_id, player_id, question_index) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return jsonb_build_object('ok', false, 'reason', 'already_answered');
  end if;
  update public.rooms set answer_count = answer_count + 1 where id = v_room.id;
  return jsonb_build_object('ok', true);
end $$;

-- A player's own answer for the current round. Correctness is only exposed
-- once the host has revealed the round.
create or replace function public.get_my_result(p_code text, p_player_id uuid, p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_room public.rooms; v_a public.answers;
begin
  select * into v_room from public.rooms where code = upper(trim(p_code));
  if not found then raise exception 'room_not_found'; end if;
  perform public._auth_player(v_room.id, p_player_id, p_token);
  select * into v_a from public.answers
   where room_id = v_room.id and player_id = p_player_id and question_index = v_room.current_index;
  if not found then return jsonb_build_object('answered', false); end if;
  if v_room.status in ('reveal', 'finished') then
    return jsonb_build_object('answered', true, 'choice', v_a.choice,
                              'is_correct', v_a.is_correct, 'points', v_a.points);
  end if;
  return jsonb_build_object('answered', true, 'choice', v_a.choice);
end $$;

-- --------------------------------------------------------------- cleanup ---
-- Run manually or schedule with pg_cron:
--   select cron.schedule('purge-bug-or-bluff', '0 * * * *', 'select public.purge_expired_rooms()');
create or replace function public.purge_expired_rooms()
returns int language sql security definer set search_path = public as $$
  with d as (delete from public.rooms where expires_at < now() - interval '1 day' returning 1)
  select count(*)::int from d
$$;
revoke execute on function public.purge_expired_rooms() from public, anon, authenticated;

-- ---------------------------------------------------------------- grants ---

revoke execute on function
  public._pick_questions(), public._host_room(text), public._auth_player(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function
  public.create_room(int), public.set_question_seconds(text, int), public.advance_game(text),
  public.pause_room(text), public.resume_room(text), public.reveal_answer(text),
  public.restart_game(text)
  from public, anon;
grant execute on function
  public.server_now(), public.get_current_question(text),
  public.join_room(text, text), public.rejoin_room(text, uuid, uuid),
  public.submit_answer(text, uuid, uuid, int), public.get_my_result(text, uuid, uuid)
  to anon, authenticated;
grant execute on function
  public.create_room(int), public.set_question_seconds(text, int), public.advance_game(text),
  public.pause_room(text), public.resume_room(text), public.reveal_answer(text),
  public.restart_game(text)
  to authenticated;
-- internal helpers (_host_room, _auth_player, _pick_questions) are intentionally not granted.
