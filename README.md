# RunLetter

Training programs from the runners you follow. Creators build programs in a web studio; followers subscribe to a creator and get today's run, send it to their watch as a .FIT workout, and have it marked done from Strava.

This repo is the app. Strategy, product specs, brand and build plan live in the project docs (Cowork `runletter/` folder, Notion, and the claude.ai "Runner APP" project). `03-build/setup.md` there is the account checklist; this README picks up where it ends.

## Stack

Next.js 16 (App Router, TypeScript, no Tailwind), Supabase (Postgres, auth, storage), Stripe (Connect + Checkout), Garmin FIT SDK, Render for hosting. Fonts are self-hosted (`public/fonts`). Design tokens are in `app/globals.css`, generated from `public/brand/tokens.json`.

## Status

Phase 1 scaffold. Everything renders from `lib/sample.ts`; nothing reads the database yet.

- `/` landing, `/c/sarah` creator page, `/c/sarah/<id>` program page
- `/app` Today (plus Week, Creators, You tabs)
- `/studio` programs list and `/studio/programs/<id>` static editor
- `/api/fit?week=3&day=4` returns a valid .FIT workout (tested)
- `/login` magic-link form, `/auth/callback`, `/auth/signout`, session refresh in `proxy.ts`
- `supabase/migrations` schema + RLS from `02-product/data-model.md`, applied to the live project; `lib/database.types.ts` generated from it

Next: phase 2 in `03-build/build-plan.md` (real programs in the studio, saved to Supabase).

## Run it locally

```bash
npm install
cp .env.example .env.local     # fill in from your password manager; never commit this file
npm run dev                    # http://localhost:3000
```

Without Supabase keys the static screens still work; the login form just won't send.

Checks, same as CI:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Wire up Supabase

Personal Supabase account, project `runletter` (ref `nbpcfuzkmmhstanaliod`, us-west-2). Migrations 0001 to 0004 were applied on Sept 11, 2026 through the Supabase connector, so the tables, RLS, functions and `covers` bucket already exist. For future migrations:

```bash
npm i -g supabase
supabase login
supabase link --project-ref nbpcfuzkmmhstanaliod
npm run db:push                                   # applies any new file in supabase/migrations
npm run db:types                                  # regenerates lib/database.types.ts
```

The project URL and publishable key (`sb_publishable_...`) are the two `NEXT_PUBLIC_` values in `.env.local`; they are safe in the browser. The secret key is not.

Then in the Supabase dashboard: Authentication → URL Configuration → add `http://localhost:3000/auth/callback` and your Render URL `/auth/callback` to redirect URLs. Authentication → Providers → Email: keep "Confirm email" on; magic links are the only sign-in.

## Wire up Stripe (test mode)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook   # prints the STRIPE_WEBHOOK_SECRET for .env.local
```

Connect (Express) onboarding and Checkout land in phase 3. Subscriptions are sold on the web, never in-app.

## Deploy to Render

`render.yaml` is a Blueprint. In Render: New → Blueprint → pick this repo. It creates one web service (`runletter`, free plan, Node, `npm run build` / `npm run start`). Secrets are marked `sync: false`, so paste them in the service's Environment tab; `NEXT_PUBLIC_APP_URL` should be the Render URL until the domain is attached.

## Keys

Keys live in a password manager and in `.env.local` / Render env vars. Never in git, never in chat, never `NEXT_PUBLIC_` for the service role key or the Stripe secret.

## Layout

```
app/            routes (App Router)
  app/          follower app (Today, Week, Creators, You)
  studio/       creator studio
  c/[handle]/   public creator + program pages
  api/fit/      .FIT download
  auth/, login/ magic-link auth
components/     ui/Logo.tsx (mark + lockup), run/* (block bar, notes, week strip)
lib/            types.ts (zod, mirrors the schema), sample.ts, fit/encode.ts, supabase/*, brand/*
supabase/       migrations
public/brand    logo SVGs + tokens.json   public/fonts  Geist + Instrument Serif
proxy.ts        session refresh + route guard (Next 16's middleware)
render.yaml     Render blueprint
```

## Conventions

- Classes from `app/globals.css` (`rl-*`, `t-*`) are the design system. Add tokens to `tokens.json` first, then the CSS.
- Serif only for editorial voice at 24px and up; never on controls. Numerals are Geist with `tnum`.
- Schema changes: new migration file + matching change in `lib/types.ts`.
- Nothing from any employer's codebase, tokens, components or accounts. This is an independent side project.
