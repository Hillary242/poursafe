# PourSafe

Field safety & compliance — accident and near-miss reports collected on site,
signed statements, and the Safety Director's review. Used by RC Structures,
Tidalforce, AFP and the rest; it names none of them. The only company a report
ever shows is the one the Safety Director sets on it.

Split out of the Ops Tracker on 14 Nov 2026. **For now it shares the Ops
Tracker's Supabase database** — that is how field reports appear in the office
Safety log — and its sign-in (an approved @rcstructures.com Google account).
It shares no code: everything it needs is in this repository, so it can get a
database of its own later without untangling anything.

## What lives where

| | |
|---|---|
| `src/app/(app)/` | the signed-in app: home, accident reports, the Safety Director's review |
| `src/app/sign-in/` | the sign-in page |
| `src/app/actions.ts` | every write (each one a database function or a policy-checked update) |
| `src/lib/filing.ts` | where a file goes in Drive and what it's called — queued for the submittals@ Apps Script |
| `src/lib/fieldI18n.ts` | every word on screen, in English, Spanish and Portuguese |
| `src/lib/fieldBrand.ts`, `public/poursafe/` | the brand pack, used as handed over |

## The database it relies on (Ops Tracker migrations)

0260 field reports, signatures and review · 0261 company set by the Safety
Director · 0262 safety-uploads bucket lockdown · 0263 PourSafe job access ·
0264 companies shown in Safety · 0265 the whole R4 form, Part Three for the
Safety Director, live updates and phone notifications. They live in the Ops Tracker repository's
`supabase/migrations` until PourSafe has a database of its own.

## Running it

```
npm install
cp .env.local.example .env.local   # fill in the Supabase URL and anon key
npm run dev                         # http://localhost:4200
```

Live at **https://poursafe.site**, deployed on Vercel from this repository;
every push to `main` deploys. The Supabase project must list
`https://poursafe.site/auth/callback` under Authentication → URL Configuration
→ Redirect URLs.

Phone notifications (Web Push) need three Vercel environment variables:
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Without
them PourSafe works and simply sends none. On iPhone a person must add PourSafe
to the home screen (Share → Add to Home Screen) before notifications can be
turned on; on Android it's the "Turn on notifications" button on the home
screen. Notifications go to whoever holds the Safety Director grant
(safety_review) and to the foreman who filed the report.
