# Prepped — AI Mock Interview Platform

A working clone of the core Expert Hire flow: paste a job description (and
optionally a resume), take a voice/text mock interview with an AI
interviewer that asks adaptive follow-up questions, then get a scored
breakdown with strengths and specific things to improve.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **NextAuth v5** — email/password auth (credentials provider)
- **Prisma + Postgres** — users, interviews, questions/answers
- **Groq API** (`openai/gpt-oss-120b`) — generates questions and scores answers, free tier, no card required
- **Web Speech API** (browser-native, no extra service) — speaks questions aloud and transcribes spoken answers. Falls back to typing automatically if the browser doesn't support it (Chrome/Edge have the best support).

## 1. Get a Postgres database

Any of these work and have a free tier — pick one, create a database, and
copy the connection string:

- [Neon](https://neon.tech) (recommended — pairs natively with Vercel)
- [Vercel Postgres](https://vercel.com/storage/postgres)
- [Supabase](https://supabase.com)

## 2. Local setup

```bash
npm install
cp .env.example .env
# fill in .env:
#   DATABASE_URL       — your Postgres connection string
#   NEXTAUTH_SECRET     — run: openssl rand -base64 32
#   NEXTAUTH_URL        — http://localhost:3000

npx prisma db push   # creates the tables in your database
npm run dev
```

Visit `http://localhost:3000`, register an account, then add your own Groq
key from the key icon in the top bar before starting an interview — there's
no shared/fallback key, see "Per-user API keys" below.

## 3. Deploy to Vercel

1. Push this project to a GitHub repo.
2. In Vercel, "Add New Project" → import the repo.
3. Add the same environment variables from `.env` in the Vercel project
   settings (Settings → Environment Variables):
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` → your production URL, e.g. `https://your-app.vercel.app`
4. Deploy. The `postinstall` script runs `prisma generate` automatically.
5. After the first deploy, run `npx prisma db push` once (locally, pointed
   at the production `DATABASE_URL`) to create the tables in production.

## No scoring at all — one AI call per interview, period

There's no scoring, no summary, no feedback generation of any kind. This is
now a pure practice tool: the AI's only job is asking good questions, not
evaluating answers. Ending an interview just marks it `COMPLETED` and shows
a simple confirmation (job title, round type, how many questions you
answered) — no `generateFeedback` call, no second AI request of any kind.

The only AI call in the entire app, per interview, is the one-time question
bank generation when it's created. Everything else — advancing between
questions, ending the interview, viewing your dashboard — is pure database
reads/writes with zero token cost. The one exception is "can you clarify
that," which is opt-in and only fires if you explicitly ask for it.

`/dashboard` lists every interview with search/round-type filters and a
delete button (`InterviewList.tsx`) — no scores, no charts, since there's
nothing to chart anymore.

## Per-user rate limiting

`MAX_INTERVIEWS_PER_DAY` in `src/lib/limits.ts` (default 8) caps how many
interviews a single account can start in a rolling 24h window — enforced in
`POST /api/interviews` before anything is created. Since every user runs on
their own Groq key already, this isn't about protecting your quota — it's a
sane guardrail against runaway usage or bugs on one account. Adjust the
constant to taste.

## Question bank architecture (the big change)

Earlier versions called the AI again after every single answer to generate
the next question — adaptive, but slow (an LLM round trip between every
turn) and expensive (resume/JD/transcript re-sent every time). The app now
generates the **entire interview's questions in one call**, before the
interview starts:

- `generateQuestionBank()` in `src/lib/groq.ts` asks for one JSON array of
  40-50 questions in a single request — item 1 is the interviewer's
  self-introduction (invents a name, uses the exact company name if given,
  greets the candidate by name if it's identifiable in their resume, asks
  them to introduce themselves), the rest spread across CS fundamentals,
  the candidate's specific resume projects/skills, and role-relevant
  questions, sized to the round type.
- `POST /api/interviews` generates that bank once and bulk-inserts every
  `Question` row up front (`prisma.$transaction` + `createMany`).
- **During the interview, there are zero AI calls to advance.**
  `InterviewSession.tsx` just walks its local array by index — submitting
  an answer is a fast DB write (`POST /api/interviews/[id]/answer`, no LLM
  call inside it at all) followed by an instant local `currentIndex + 1`.
- The only other AI calls in the whole flow: `generateClarification()`
  (small, on-demand, only if the candidate explicitly asks to clarify) and
  one `generateFeedback()` call at the very end to score the session —
  bounded to the most recent 20 answers regardless of how large the bank
  was, so even a 50-question interview keeps that final call cheap.

Net effect: **1-2 AI calls total per interview** instead of one per
question, and moving between questions is instant since it's no longer
waiting on an LLM.

## Voice pacing: pause to advance, no Send button

- **Auto-listen** — the mic starts listening automatically the moment the
  AI finishes speaking each question (`autoStartListening` in
  `InterviewSession.tsx`).
- **~2 second pause = done answering.** There's no Send button in pure
  voice mode — `SILENCE_AUTO_ADVANCE_MS` in `InterviewSession.tsx` moves to
  the next question automatically after a short pause, the way a real
  conversation works rather than a form waiting for a click. Two
  independent signals trigger this (whichever fires first): a manual JS
  timer reset on every speech update, and the browser's own recognizer
  ending on its own after silence — both funnel through the same
  `handleSend()`, guarded by a synchronous ref-based lock so they can't
  double-submit the same answer.
- **Barge-in** — if the candidate starts talking while the AI is still
  asking its question, the AI's speech is cut off immediately
  (`speakingRef`) instead of talking over them.
- The Send button only reappears for typed input or the Coding-round code
  editor, where a pause doesn't mean "done."
- **"Type instead"** — one tap away for browsers without Web Speech
  support (Safari, mostly), or anyone who'd rather type; switches off
  auto-listen and brings back the Send button.

**Talk to it like an interviewer, not a form:** say "can you repeat that" or
"can you clarify" and it responds appropriately instead of treating it as
your answer (`detectIntent()` in `InterviewSession.tsx`). Repeating costs
zero AI tokens (it just replays the same text via speech synthesis);
clarifying makes one small, cheap, on-demand API call.

## Call-style interview UI

- **User panel / AI panel** side by side — user's camera feed (toggleable;
  shows a placeholder avatar when off) and an AI avatar that gets a glowing
  ring (`.avatar-speaking`) while it's speaking, plus live captions.
- **Call controls** — mic mute/unmute, camera on/off, red end-call button.
- **Progress** shows both "Question X of N" and a countdown timer — the
  interview ends on whichever comes first: the bank running out or time
  running out.

## Code editor for Coding rounds

When `roundType === "CODING"`, `InterviewSession.tsx` swaps the answer box
for a monospace textarea (with Tab-to-indent) instead of the voice flow —
still no code execution, but it reads real code or pseudocode.

## Variety across interview attempts

Two different interviews for the same role/round used to converge on
similar-feeling questions. `generateQuestionBank()` randomizes the bank
size (40-50) and runs at `temperature: 0.85`, and the GENERAL round's
guidance explicitly spreads questions across CS fundamentals, specific
resume projects, and role-relevant skills rather than settling into one
lane — all within that single generation call, so variety doesn't cost
extra requests.

## Token optimization

- **The core fix: one generation call instead of one-per-question.** This
  is by far the biggest token/latency win — see "Question bank
  architecture" above.
- `src/lib/groq.ts` still caps how much of the resume/job description/each
  answer gets sent per call (full text stays in the database — only the
  prompt payload is trimmed).
- Feedback dropped strengths/improvements from its schema (just scores +
  summary now) and samples at most the most recent 20 answers, so scoring
  stays cheap even after a 50-question interview.
- Clarifications deliberately skip the full transcript — they only need
  the current question, not the whole interview so far.
- **`reasoning_effort: "low"` on every call.** `openai/gpt-oss-120b` is a
  reasoning model — by default it spends hidden "thinking" tokens before
  writing its actual answer, and those count against `max_tokens`. That
  caused a real bug (the feedback call could exhaust its token budget
  mid-thought, before writing any JSON, and error out). Setting reasoning
  effort to low fixes the crash and meaningfully cuts token spend, since
  none of these calls need deep reasoning — question generation and
  scoring are both closer to "structured writing" tasks.
- API routes never surface raw provider error text to the client anymore
  (it was leaking full Groq HTTP error bodies into the UI on failure) —
  logged server-side via `console.error`, shown to the user as a clean
  one-line message.

## Interview configuration

- **Job role presets** — pick from a list of common CS/engineering roles and
  the job description auto-fills (still fully editable), or choose "Custom"
  to write your own from scratch.
- **Round type** — Coding, Aptitude, HR, Communication, System Design,
  General, or VC Pitch. Each has its own question style baked into the
  Groq prompt (`src/lib/groq.ts` → `ROUND_GUIDANCE`). HR/General/Communication
  rounds weight questions toward the candidate's resume more heavily.
- **Duration, not fixed question count** — pick 25/30/45 minutes. The
  interview keeps generating follow-up questions until time is nearly up,
  then wraps with a closing question. A visible countdown and a "last
  minute" warning banner handle the pacing; users can also end early anytime.

## Per-user API keys (required, no shared key)

There is no app-wide Groq key. Every user must add at least one of their own
free Groq API keys from `/settings/keys` (the key icon in the top bar)
before they can start an interview — `/interview/new` checks this
server-side and shows an "add a key" prompt instead of the setup form if
they have none, and `POST /api/interviews` re-checks it as a backstop.

This keeps cost/quota entirely on each user's own account. When a user has
more than one key saved, an interview call that hits a rate limit (HTTP 429)
on one key silently retries with the next available key
(`src/lib/groqKeys.ts`) — no error shown, no delay beyond the retry itself.
A key that gets rate limited is marked with a cooldown timestamp and skipped
until it recovers.

## How the interview flow works

1. **`/interview/new`** — server-checks the user has a saved Groq key first;
   if not, shows an "add a key" prompt instead of the form. Otherwise, user
   enters job title/company (or picks a role preset), pastes/edits the job
   description, picks round type + duration, optionally uploads a resume
   (PDF or .txt). Submitting calls `POST /api/interviews`, which checks the
   daily rate limit, generates the full 40-50 question bank in one call, and
   bulk-inserts every question up front.
2. **`/interview/[id]`** — call-style UI: speaks each question aloud, takes
   voice or typed/code answers, supports "repeat"/"clarify" without
   advancing. Answering is pause-based (~2s of silence auto-advances, no
   Send button needed) and purely local — no AI call happens between
   questions. `POST /api/interviews/[id]/answer` just saves the answer; the
   interview ends (whichever comes first) when the bank runs out or the
   timer does, calling `POST /api/interviews/[id]/finish` — a plain status
   update, no AI call, no scoring.
3. **`/interview/[id]/feedback`** — a simple "practice complete" confirmation
   (role, round type, how many questions answered). No scores, no summary.
4. **`/dashboard`** — a filterable, deletable list of every interview.

## Not in this build (bigger scope, worth their own pass)

- **Real-time streaming voice.** Right now voice is turn-based: browser
  speech-to-text → text sent to Groq → text-to-speech reply. There's
  inherent latency between the user finishing and the AI responding, and
  true mid-sentence interruption (beyond the barge-in already implemented)
  needs a duplex audio stream to a realtime voice model, not a request/response
  text API. Groq's public API is text-completion + Whisper-transcription
  based, not a realtime voice-to-voice endpoint — doing this properly means
  picking a specific realtime voice provider and building a WebSocket/WebRTC
  audio pipeline, which is a project of its own rather than an add-on to the
  current architecture.
- **University/recruiter dashboard.** Needs a real permissions model — a
  `role` field on `User`, an `Organization`/cohort model linking students to
  a university or recruiter account, and a separate set of aggregate-stats
  views. Worth building once there's an actual institutional user to design
  it around.
- **ATS-style resume scoring tool.** A standalone feature (resume in, score
  + feedback out) rather than part of the interview flow — different UI,
  different prompt design, arguably its own page. Straightforward to add
  later; skipped here to keep this pass focused on the interview experience
  itself.

