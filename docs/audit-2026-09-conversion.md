# RunLetter conversion audit — September 2026

Goal of the audit: every visitor starts a free account. Two passes: a designer pass on the visuals, and a first-time-user pass clicking through. Screens reviewed at 1440 and 390 from a no-auth preview build: `/`, `/creators`, `/signup`, `/c/sarah`, `/app` (Today), `/studio`, the plan editor.

## The one-sentence verdict

The brand is real (serif voice, ink sketches, run-type colour) and nothing looks vibe-coded — but the landing page argues instead of demonstrating, the sign-up is a wall, and the first logged-in screen has nothing to do. Visitors who would convert are being asked to read 400 words and fill in three fields before they see a single run on a watch.

---

## Pass 1 — the designer

### Landing page `/`

1. **Hero stack is nine things tall.** Eyebrow, three-line headline, rotating subline, four-line paragraph, two buttons, avatar row, caption, works-with strip, then a timetable. Linear and Vercel show headline → one line → one button → product. On 390px the first button is at ~620px; the product (the week timetable) is below 1,000px. The thing that sells RunLetter — a real run in a real card — is the last thing in the hero.
2. **Two equal CTAs split the click.** "Find your runner" and "I'm the runner people follow" sit the same size. The creator path is 1 percent of visitors; make it a text link, not a button. One primary, always.
3. **The eyebrow repeats the headline.** "Find the runners who inspire you" / "Train alongside the runners who inspire you". Delete the eyebrow.
4. **Rotating subline in blue serif on Night** ("run club captain") — the italic-blue-on-black pair reads as a link that doesn't work. Either it's a control or it isn't.
5. **Cohort banner + header + hero = three dark/light bands before content.** The blue promo strip, then Paper header, then Night hero. On mobile it's a colour sandwich. Fold the cohort message into the hero subline or drop it.
6. **Below the fold depends on `data-reveal` JS.** In a full-page capture without scrolling, every section past the hero is blank. If the observer fails (old Safari, reduced-motion, prerender, a crawler), the page is empty. Reveal must be progressive enhancement: content visible by default, animation added when JS lands.
7. **Copy density.** Every section has a label, a serif headline, and a 3–4 line paragraph. "Three moves. One of them is running." then three paragraphs of the same length. Cut each body to one line. The brand rule is labels over sentences — the landing page breaks it more than the app does.
8. **"Example week from a creator's program. Yours comes from whoever you follow."** Caveat text under the timetable and again under the creators grid ("Example creators, drawn not photographed"). Disclaimers on a landing page read as "we don't have any yet". Drop the caveats; use one named example and let it be real.
9. **Sketch runners on the hero (creators page) float in the top-right with nothing anchoring them.** The ink is good; it needs a baseline (a track line or the header rule) or it looks like clip art.
10. **Two Promises band** is the strongest copy on the site ("No AI writes the running.") and it is buried at position five. Move it into the hero as the subline or directly under it.
11. **Works-with strip:** the Strava mark is coloured, Garmin/COROS are words, Apple Fitness has a "SOON" chip. Three different treatments in one row. Wordmarks only until you have permission for each mark, all in one weight, no "soon".
12. **Footer is one line.** No pricing, no "how it works", no creators link, no legal. A visitor who scrolls to the bottom looking for the price finds nothing.

### Creators page `/creators`

13. Same nine-item hero. The paragraph explains Letter and Plans in four lines — that's a docs page, not a hero. Headline + "Free. You keep 80 percent." + one button.
14. "Start your Letter" in the hero vs "Start a program" in the header. Two names for the same action on the same screen.
15. The 01/02/03 blue numerals are the only saturated colour on the page apart from the header button. Good hierarchy — keep, and use the same blue nowhere else on this page.
16. Editor screenshot section is genuinely persuasive. It should be the second thing on the page, not the sixth.

### Sign-up `/signup`

17. **Five decisions before the first click:** run or create, name, email, password, password-or-link. Superhuman-grade would be email → magic link, or one OAuth. Given the email rate limit, the fastest honest path is: email + password only, name asked later (Today screen already says "Morning, Ian." — ask the name after they see that).
18. The run/create switch is a control on the sign-up form. The visitor already chose a path by clicking a button on the landing page; showing the switch again makes them doubt the choice. Keep the switch on `/login` only, or hide it when `?as=` is set.
19. "Sign-in is not configured in this environment" is preview-only, but confirm it can never render in prod.
20. The parallax ink in the margins competes with a 400px form on a 1440 screen. On auth pages, mute the ink to 30 percent or drop it — the form is the only thing that should have contrast.
21. Headline "Open your studio" / "Start running with them" is fine. There is no benefit line under it. One line: "Free. Your first week is on your watch in five minutes."

### Creator page `/c/sarah`

22. The `Subscribe · $7/mo` button is the first ask, before a visitor has seen a single run. Above it should be this week's runs (or the week that's out), free to look at. Sell after showing.
23. "Cancel any time. Sold on the web." — "sold on the web" is an App Store compliance note, not a customer sentence. Remove.
24. The plan card cover is the same loop sketch used on the studio example, the creators page, and the landing page. One sketch everywhere reads as a placeholder. Covers need photos (situations set) or per-plan sketches.
25. INSTAGRAM / STRAVA chips are uppercase label style used for links. Labels don't get clicks. Make them icon-less text links.

### Today `/app` (no enrolment)

26. This is the best screen: date, greeting, "Nothing planned. Pick one.", two photo cards, one button. It just has too much empty space on desktop — a two-card rail on a 1440 canvas leaves 60 percent blank. Show four cards in a row on desktop, and put the run log below even when empty (shows what the app will do).
27. "Nothing planned. Pick one." is set in serif at title size. Under the brand rule, serif is for editorial voice; this is a control instruction. Set it in the sans title style, or rewrite it as a voice line ("Nobody's sent you a week yet.").

### Studio `/studio`

28. "STUDIO / Studio" eyebrow-and-headline duplicate (when no name). Same on Today. Never stack a label and a headline that say the same word.
29. The Letter start card is good, but "Start my Letter" is disabled in preview and its disabled state is nearly invisible (grey on grey). The disabled/enabled contrast needs a token.
30. The example plan card carries six chips. Three max: weeks, level, price.
31. Sidebar: "Letter & plans", "Runners", "Your page", "Payouts", then 600px of nothing, then "Sign out". Either the sidebar earns its width with something (this week's issue status, subscriber count) or it becomes a top bar like the runner app.

### Editor

32. This is the screen that sells creators — 8 weeks × 7 days, colour by run type, shape palette on the right. Strong. The left "This plan" panel duplicates the studio home form (cover, title, description, goal, level, weeks, price) and pushes the grid right. Collapse it to a header row and put the palette where it was.
33. Empty weeks each show seven `+` cells. 56 empty cells read as homework. Empty weeks collapse to one row ("Week 2 · empty · +") until opened.

---

## Pass 2 — the first-time user

I'm a runner who saw a creator post "get my weeks on RunLetter". I open the link on my phone.

**0:00** Blue banner about a creator cohort I don't care about. Header. A dark hero with a headline about inspiring runners. I scroll. Paragraph. Two buttons — which one is me? "Find your runner" — I already know my runner, she sent me here. Neither button says "Follow Sarah".

**0:20** I keep scrolling. A week timetable, a run card that says "Send to watch" — I tap it. Nothing happens; it's an illustration. First disappointment: the page shows a button that doesn't work.

**0:40** Three moves, two promises, six creators I've never heard of, device cards, a dark "Your first week is waiting" block with two buttons again. I still haven't seen Sarah.

**1:00** I go back to the creator link `/c/sarah`. Photo, name, "Subscribe · $7/mo". I don't want to pay yet. There's one plan card with a scribble. What do I actually get this week? I can't see it.

**1:20** I tap Subscribe → sign-up. I have to choose run or create (I did that already), type my name, email, password. The password field says "at least 8 characters" — no visibility toggle, no strength meter, no "sign up with Google". I type it twice because iOS autofill fights the form.

**1:50** I'm in. "Today. Nothing planned. Pick one." — wait, I subscribed to Sarah. Why is nothing planned? (Because Stripe isn't wired yet; but the user doesn't know that.) I see two photo cards from Sarah and Marcus. I tap "Send to watch" — a `.fit` file downloads to my phone. I don't know what to do with a .fit file. There's no "here's how it gets to your Garmin" step.

**2:20** I tap "You". A 5K time form, Connect Strava, Garmin "Coming", COROS "File import". I connect Strava — works, redirects back. Nothing changes on Today. I still don't have a week.

**Where I churned:** minute 1:00, at the creator page, because I couldn't see the runs before paying, and minute 1:50, at Today, because the app didn't know I came from Sarah.

### What the first-time user needed, in order

1. `/c/sarah` shows this week free, with one run open, and "Follow Sarah — free" as the first button. Paid subscribe is second, for the Letter.
2. The follow intent survives sign-up: `/signup?next=/c/sarah&follow=sarah` → after sign-up, auto-enrol in the free tier and land on Today with Sarah's week showing.
3. Sign-up is email + password only. Name is asked on Today the first time, inline, optional.
4. "Send to watch" on phones explains itself: the first tap opens a two-line sheet ("Saved. Open Garmin Connect → Training → Import" / "Connect Garmin and this becomes one tap") — not a bare download.
5. Onboarding Connect step runs immediately after sign-up (it exists at `/welcome` but the sign-up lands on `/app`; check that `next` doesn't skip it).

---

## Priority list — do these, in this order

| # | Change | Why it moves sign-ups | Effort |
|---|---|---|---|
| 1 | Landing hero: headline, one line ("No AI. Real runners. Your watch."), ONE button "Start free", creator path as a text link. Move the run card up so it is visible in the first viewport on mobile. | Cuts the hero from 9 items to 4; product visible above the fold. | S |
| 2 | Creator page shows the week free; "Follow — free" first, "Subscribe $7" second. | The link creators share is the real landing page. | M |
| 3 | Follow intent survives sign-up and auto-enrols; Today shows the creator's week immediately. | Kills the "why is nothing planned?" churn. | M |
| 4 | Sign-up: drop name and the role switch when `?as=` is set; email + password; magic link stays as the fallback. | Five decisions → two. | S |
| 5 | Make `data-reveal` sections visible without JS. | Blank pages are the worst conversion rate. | S |
| 6 | Delete the caveats ("Example week…", "Example creators, drawn not photographed"), delete the eyebrow that repeats the headline, cut every body paragraph to one line. | Reads as confident instead of apologetic. | S |
| 7 | "Send to watch" on the web explains the file once; connected-watch users get one tap. | The core promise has to feel like one tap the first time. | M |
| 8 | Today desktop: four-card rail, run log always present. Studio: sidebar → top bar; editor's plan panel → header; empty weeks collapse. | Fills dead space, halves the editor's first-glance weight. | M |
| 9 | Footer with Pricing, For creators, How it works, Privacy, Terms. | Trust and findability for the scroll-to-bottom reader. | S |
| 10 | Serif only in voice: "Nothing planned. Pick one." → sans; auth-page ink muted. | Brand rule consistency. | S |

Not in scope: Stripe, OAuth sign-in (worth it but needs Google console + Supabase provider setup), Garmin push (waiting on developer keys).
