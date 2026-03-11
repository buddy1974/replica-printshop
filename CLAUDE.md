# replica.printshop — Project Instructions for Claude

Read this file at the start of every session. Do not drift from these rules.

---

## Project

Next.js 14 printshop: shop, editor, admin, uploads, production flow.
Live on Vercel. Auto-deploy from `main` branch.

**Workflow:** edit → `npx tsc --noEmit` → `npm run build` → commit → push → Vercel deploys → verify

---

## Auth

Google OAuth login IS IMPLEMENTED and must stay.

Relevant files:
- `src/app/api/auth/google/route.ts`
- `src/app/api/auth/google/callback/route.ts`
- `src/app/auth/complete/page.tsx`
- `src/app/login/page.tsx`

Required env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`

**Do NOT remove Google login. Do NOT revert the auth system.**

---

## Public branding

Public brand name: **Printshop**
Remove "replica" from all public-facing UI. Internal repo/config names are fine.

---

## Textile print — allowed methods

- DTF transfer
- Flex
- Flock
- Embroidery
- Patches

**Not allowed (never reintroduce):**
- DTG
- Screen print
- Textile sublimation

---

## Sublimation — hard goods only

Sublimation is only for: mug, magic mug, stainless bottle/cup.
Never describe sublimation as a textile method.

---

## Graphic installation — allowed services

Vehicle graphics (NOT full car wrap), window foil, signage, milchglasfolie,
lochfolie, lightbox, plexiglass signs, vinyl floor, boat lettering, truck banners,
event graphics, wedding graphics, company signs.

Use "vehicle graphics" everywhere. Not "vehicle wrap" or "vehicle wrapping".

---

## Visual design

**Palette:** black, red, white. No blue as dominant brand color.

**Homepage:** uses `HeroSlider` (full-width, large images, CTA overlay). Do not replace with static hero.

**Footer:** must include `stripe.png` payment image, social links. DHL/UPS shipping logos to be added.

---

## Do not reintroduce

- DTG / screen print / textile sublimation
- Google login removal
- Full car wrap service
- "replica" in public UI
- Blue-first brand design
- Static hero replacing HeroSlider

---

## Stack reference

- Next.js 14 App Router, TypeScript, `src/` dir
- Prisma 7 + Neon PostgreSQL
- Tailwind CSS v4 (CSS-first, `@import "tailwindcss"`)
- Stripe (test mode, API version `2026-02-25.clover`)
- Import Prisma client from `@/generated/prisma/client` (not `@/generated/prisma`)
