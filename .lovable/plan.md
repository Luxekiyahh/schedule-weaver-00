# Header + App-wide Theme Rollout

## 1. Homepage header (mobile fit)

`src/routes/index.tsx` → `Nav`:
- Reveal Sign In on all breakpoints (remove `hidden sm:inline-flex`), tighten to `text-[10px] px-2.5 py-2` on mobile / `text-[11px] px-4` from `sm:`.
- Compact the Get Started CTA on mobile: `px-3.5 py-1.5 text-[10px]` → `sm:px-5 sm:py-2 sm:text-[11px]`; hide the arrow under `sm:` (`hidden sm:inline`) so both buttons fit at 360px.
- Shrink logo lockup on mobile (`w-8 h-8`, hide wordmark under `xs`) and reduce container padding to `px-4` on mobile for breathing room.

## 2. Shared brand tokens

Add luxury palette + dark-mode counterpart to `src/styles.css` under `:root` and `.dark` using `oklch`:
- `--background`, `--foreground`, `--card`, `--border`, `--primary` (gold), `--primary-foreground` (ink), `--muted`, `--accent`, `--ring` — light mode = parchment/ink text, dark mode = ink/gold text.
- New gradient/shadow tokens: `--gradient-gold` (#E7C989→#C9A15A→#9C7A3C), `--shadow-luxe`, `--color-ink-900`, `--color-line`.
- Map inside `@theme inline` so `bg-primary`, `border-border`, etc. resolve everywhere.
- Add `Montserrat` as the default `font-sans` via `--font-sans` in `@theme`.

All new UI below uses these semantic tokens — no hardcoded hex.

## 3. Auth pages (/login, /forgot-password, /reset-password, /onboarding shell)

- Wrap each in a full-height ink gradient background with a centered `Card` styled with `bg-card/80 backdrop-blur border-border` and a gold hairline top rule.
- Header shows the Signet + Wordmark (extract both into `src/components/brand/Signet.tsx` and `Wordmark.tsx` so all pages share them).
- Replace shadcn button primary usage on these pages with the gold gradient (`bg-[image:var(--gradient-gold)] text-primary-foreground`).
- Inputs: dark ink surface, gold focus ring via `--ring`.

## 4. Dashboard theme + light/dark toggle

- New `src/components/theme/ThemeProvider.tsx`: persists `theme` (`light` | `dark`) in `localStorage` under `ps-theme`, applies/removes `dark` class on `<html>`. Read in `useEffect` to avoid SSR mismatch; default = `dark`.
- Mount provider in `src/routes/dashboard.tsx` (covers every `dashboard.*` subpage automatically since they share the layout).
- Add `ThemeToggle` (Sun/Moon lucide icons) in the dashboard header/sidebar top bar.
- Restyle the dashboard shell (background, sidebar, cards, tables, badges) with semantic tokens so both themes are consistent. Keep functional markup, only swap classes: `bg-slate-*` / `text-slate-*` → `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`.
- Sweep every `src/routes/dashboard.*.tsx` file for hardcoded slate/indigo/white classes and replace with tokens so the toggle actually flips subpages (home, calendar, catalog, services, staff, availability, customize, notifications, payments, billing).

## 5. Admin pages

- Admin is operator-only and stays dark by default (no toggle) but adopts the same tokens so it visually matches.
- Update `src/components/admin/AdminGate.tsx` (`AdminGate` + `AdminNav`) and each `admin.*.tsx` route: swap `bg-slate-50`, `text-slate-900`, hardcoded indigo/emerald tile colors for `bg-background`, `text-foreground`, `text-primary`, `bg-card`, `border-border`. Gold accent for the active nav pill.

## 6. Verification

- `bunx tsgo --noEmit`.
- Playwright: mobile viewport (390×844) screenshot of `/` header to confirm Sign In + Get Started both fit; screenshots of `/login`, `/dashboard/home` in both themes, and `/admin` to confirm the palette.

## Technical notes

- No routing, data, or auth logic changes.
- Theme provider is client-only; guard `localStorage` reads behind `useEffect`.
- Brand components extracted from `src/routes/index.tsx` and re-imported so the homepage keeps rendering identically.
- Sidebar collapse / existing dashboard layout untouched.
