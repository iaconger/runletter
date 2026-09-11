# RunLetter — notes for Claude

Two-sided running app. Creators build training programs in a web studio (`/studio`); followers subscribe to a creator and get today's run (`/app`), export it to their watch as .FIT, and get it marked done from Strava. Product specs, brand and build plan live in the claude.ai project "Runner APP" (01-strategy, 02-product, 03-build, 04-go-to-market, 05-brand). Read `03-build/build-plan.md` for the current phase and `03-build/decisions.md` before changing direction.

## Hard rules
- Independent side project. Never pull code, tokens, components, fonts or accounts from the owner's employer. Personal accounts only.
- No keys in git or in chat. `.env.local` only; service role key and Stripe secret are server-only.
- Subscriptions are sold on the web (Stripe Checkout), never in-app.
- No guided audio in the MVP.

## Code conventions
- Next 16 App Router, TypeScript strict, no Tailwind. Styling is `app/globals.css` (`rl-*` components, `t-*` type) driven by `public/brand/tokens.json`. Add a token before adding a color or size.
- Serif (`--rl-font-display`) only for editorial voice at 24px+, never on controls. Geist for UI and numerals (`tnum`).
- Logo: use `components/ui/Logo.tsx` (`Mark`, `Lockup`). Never edit the path data by hand; source is `05-brand/logo/`.
- Schema is `supabase/migrations`; `lib/types.ts` mirrors it with zod. Change both.
- Supabase via `lib/supabase/{client,server}.ts`; session refresh in `proxy.ts`. Anon key + RLS everywhere; service role only in webhooks.
- FIT export in `lib/fit/encode.ts`, tested with a decoder round-trip. Keep that test green.
- Tests: `npm test` (vitest, `lib/**/*.test.ts`). CI runs typecheck, lint, test, build.

## Phase 1 state
Static screens from `lib/sample.ts`. Phase 2 replaces `sample*` imports with Supabase queries and makes the editor writable.
