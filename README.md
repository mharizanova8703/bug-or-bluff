# 🎃 Bug or Bluff? 👻

A live, multiplayer Halloween coding quiz for the **Frontend Queens** Meet & Greet — a mini Kahoot built with
**Vue 3 (Composition API) + Vite + Tailwind + Supabase Realtime**. The host shares one screen on Zoom, 14–25 players
scan a QR code and answer on their phones.

- Host dashboard `/host` — protected by Supabase Auth, creates the room, shows the QR code, runs the game
- Player join `/join/:roomCode` — nickname only, no account; waiting room that auto-starts
- Player game `/play/:roomCode` — question, 4 big answer buttons, countdown, feedback, leaderboard, reactions

8 rounds are drawn at random from a bank of 28 questions (2 from each category: **Spot the Bug 🐛**, **Guess the
Cursed Output 👻**, **Bug or Bluff? 🎭**, **Find the UI Monster 🧟**).

---

## 1. Install

```bash
npm install
cp .env.example .env     # then fill in the two Supabase values (step 2)
npm run dev              # http://localhost:5173
```

Requires Node 18+.

## 2. Supabase setup (≈ 5 minutes)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: paste and run, in order,
   1. `supabase/migrations/20261028000001_schema.sql` (tables, RLS, game functions, realtime)
   2. `supabase/migrations/20261028000002_seed_questions.sql` (the 28 questions)

   (Or with the Supabase CLI: `supabase link` then `supabase db push`.)
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key into `.env`
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). **Never** put the `service_role` key in the frontend.
4. **Create the host account** — Authentication → Users → *Add user* → *Create new user* (tick *Auto Confirm*).
5. **Lock it down** — Authentication → Sign In / Providers → Email: turn **off** "Allow new users to sign up" so
   only the host you created can create rooms. (Leave it on while testing if you want the sign-up form in `/host`
   to work; with email confirmation on, you must click the emailed link first.)
6. Realtime is enabled by the migration (`rooms` and `players` are added to the `supabase_realtime` publication).
   Nothing to toggle in the dashboard.

> Editing questions: change `src/data/questions.js`, run `npm run seed:sql`, and re-run the regenerated
> `…_seed_questions.sql` in the SQL editor. That file is **never imported by the browser**; it only exists to
> generate the seed, so correct answers are not in the client bundle.

## 3. Run a game

1. Open `/host`, sign in, choose a default timer (15 / 20 / 30 s), click **Create game room**.
2. The lobby shows a large **QR code**, the **join URL** and a 5-letter **room code**. Share your screen on Zoom.
3. Players scan the QR code (or open the URL), enter a nickname, and appear in the lobby live.
4. Optionally change the timer, then **Start Game**.
5. Each round: the timer runs → at 0 the host screen auto-reveals (or press **Reveal Answer** early; **Pause** stops
   the clock) → answer, explanation, answer distribution and the Top 5 → **Next Question**.
6. After round 8: **👑 THE ULTIMATE BUG HUNTER!**, podium, confetti, group stats and the trickiest question.
   **Start a new game** resets scores, draws a new set of 8 questions and keeps the players in the lobby.

If the host refreshes the page they land straight back in their room. If a player refreshes, their session
(stored in `localStorage` and validated server-side) re-attaches them to the same player: no duplicates.

## 4. Test with multiple devices

Phones must reach the page, so `localhost` will not work for the QR code. Pick one:

- **Same Wi-Fi (LAN)**: `npm run dev` already binds to the network (`--host`). Note the `Network:` URL Vite prints
  (e.g. `http://192.168.1.20:5173`), set `VITE_PUBLIC_URL=http://192.168.1.20:5173` in `.env`, restart, and open
  `/host` on the laptop. The QR now points at the LAN address.
- **Anywhere**: deploy to Vercel (below) — the QR automatically uses the deployed origin.
- **Tunnel** (ngrok / Cloudflare Tunnel): set `VITE_PUBLIC_URL` to the tunnel URL.

To simulate a crowd without 25 phones, open several **private/incognito windows** (each has its own
`localStorage`, so each is a distinct player) and join with different nicknames.

Checklist before the event: join on one iPhone and one Android, refresh a player mid-question (it should resume),
toggle airplane mode for a few seconds (it should reconnect), pause/resume, and play through to the final screen.

## 5. Deploy to Vercel

1. Push the project to GitHub and **Import** it in Vercel (framework preset: Vite — build `npm run build`, output
   `dist`). `vercel.json` already rewrites all routes to `index.html` so `/join/ABCDE` deep links work.
2. Add environment variables (Production *and* Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
   `VITE_PUBLIC_URL` is optional (only needed if players reach the site via a different origin).
3. Deploy, then add your Vercel URL to Supabase **Authentication → URL Configuration → Site URL**
   (needed only for email confirmation links).

## 6. How it works

| Concern | Implementation |
| --- | --- |
| Host-only control | `create_room`, `advance_game`, `pause_room`, `resume_room`, `reveal_answer`, `restart_game`, `set_question_seconds` are `SECURITY DEFINER` functions that require `auth.uid() = rooms.host_id`. Not callable by `anon`. |
| Correct answers hidden | `questions` has RLS enabled with **no policies** and no grants: unreadable by clients. Players get the question via `get_current_question()` *without* the answer; the answer arrives in `rooms.reveal` only after the host reveals. |
| Server-side scoring | `submit_answer()` validates the player's secret token, round state and time window, computes points from `clock_timestamp()` and `question_started_at`/`question_ends_at`, and stores them. Scores are added to `players` only when the round is revealed (so the leaderboard never leaks who was right). |
| One answer per question | `answers` primary key `(room_id, player_id, question_index)` + `ON CONFLICT DO NOTHING`. |
| Timer | Host-authoritative `question_ends_at`. Clients correct for their clock drift using `server_now()` (lowest-RTT of 3 samples, refreshed every minute). Pause stores `paused_remaining_ms`; resume shifts start/end so the speed bonus ignores the pause. Submissions after `ends_at + 600 ms` (latency grace) or after reveal are rejected. |
| Scoring | Correct = 100 + up to 50 speed bonus (linear over the question time). Wrong / no answer = 0. Ties are broken by correct count, then nickname. |
| Realtime | One channel per room: `postgres_changes` on `rooms` (game state, live answer counter) and `players` (lobby, leaderboard), **Presence** (online dots), **Broadcast** (emoji reactions). On every (re)subscribe, tab refocus, `online` event, and every 6 s the client re-fetches state, so brief disconnects self-heal. |
| Player identity | `join_room` returns `{player_id, token}`; the token lives in `player_secrets` (unreadable) and in the browser's `localStorage`. `rejoin_room` re-validates it. |
| Nickname safety | The database strips `< > & " ' \`` and control characters, trims, enforces 2–16 chars and per-room uniqueness; Vue also escapes all output (no `v-html` on user text). |
| Expiry | Rooms expire 8 h after creation; every function rejects expired rooms; `purge_expired_rooms()` can be scheduled with pg_cron. Disconnected players simply show as offline in the lobby and can rejoin. |
| Capacity | 60 players per room cap; designed and sized for 14–25. |

### Project layout

```
src/
  views/        HomeView · HostView · JoinView · PlayView
  components/   QuestionCard · CountdownTimer · Leaderboard · PlayerLobby · QRCodeDisplay · ReactionOverlay
                HostGame · ReactionBar · FeedbackBurst · WinnerCelebration · StatsPanel · HalloweenBackground …
  composables/  useGameRoom.js (state + countdown) · useRealtime.js (channel, presence, reconnect)
  lib/          supabase.js · api.js (RPC wrappers) · session.js · sound.js (WebAudio) · prefs.js · …
  data/         questions.js  (seed source only, not shipped to the browser)
supabase/migrations/   schema + policies + functions · generated question seed
scripts/generate-seed.mjs
```

### Accessibility notes

Semantic landmarks and a skip link; every control is a real `<button>`/`<input>` with a label and a visible
focus ring; answers also work with keys **1–4 / A–D**; focus moves to the new state's heading after each
transition; `aria-live` regions announce joins, locked answers, reveals and results; the countdown is *not* read
every second (only "10 seconds left", "5 seconds left", "Time's up"); correct / incorrect is conveyed with icons and
text, never colour alone; ≥ 48 px touch targets; `prefers-reduced-motion` disables decorative animation, confetti,
and floating reactions; sounds can be muted from the always-visible speaker button (the choice is remembered).

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Supabase isn't connected" screen | `.env` missing or has wrong names. Restart `npm run dev` after editing it. On Vercel, set the variables and **redeploy**. |
| `not_enough_questions` when creating a room | The seed migration wasn't run. Run `…_seed_questions.sql`. |
| Host sign-in says "Invalid login credentials" | Create the user in Authentication → Users (tick Auto Confirm), or confirm the email if you signed up via the form. |
| `permission denied for function …` | The schema migration didn't finish (the `grant` section is at the bottom). Re-run it; it is idempotent. |
| Players don't appear live / stuck on "Reconnecting…" | Check the browser console for Realtime errors; confirm `rooms` and `players` are in the `supabase_realtime` publication (Database → Publications). The 6 s fallback poll still updates state, only slower. Corporate/guest Wi-Fi sometimes blocks WebSockets: try mobile data. |
| QR code opens `localhost` | Set `VITE_PUBLIC_URL` (see §4) or use the deployed site. |
| "Someone already took that nickname" | Nicknames are unique per room (case-insensitive). The same phone re-attaches automatically, but a *cleared browser* has lost its session and needs a new nickname. |
| Direct link `/join/ABCDE` gives 404 on Vercel | `vercel.json` must be in the project root (it ships with the repo). |
| No sound on iPhone | iOS only allows audio after a tap; make sure the speaker button isn't muted and the phone's silent switch is off. |
| Timer feels off on one phone | Clocks are re-synced every minute; reopen the page to resync immediately. |

## 8. Scripts

```bash
npm run dev        # dev server on your network
npm run build      # production build → dist/
npm run preview    # serve the production build
npm run seed:sql   # regenerate the questions seed migration from src/data/questions.js
```

Have a spooktacular time, Coding Queens! 👑🎃👻
