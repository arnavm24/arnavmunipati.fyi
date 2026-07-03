# arnavmunipati.fyi

Personal portfolio — live at [arnavmunipati.vercel.app](https://arnavmunipati.vercel.app/).

Hand-built with vanilla HTML, CSS, and JavaScript. No frameworks, no build step.

## Under the hood

- **Typography**: self-hosted variable fonts (Fraunces for display, Inter for UI), latin
  subsets, preloaded, ~115KB total
- **Rubik's cube quiz**: a fully functional 3D cube in pure CSS transforms + vanilla JS —
  real layer-turn mechanics, sticker rotation math, and move-inversion solving (answer
  correctly and it physically unwinds the scramble)
- **Motion**: staggered scroll reveals, hero entrance sequence, theme cross-fade — all
  collapsed under `prefers-reduced-motion`
- **Theming**: dark/light with system-preference detection (pure CSS on first visit, stored
  choice wins after a toggle), synced `theme-color`
- **Accessibility**: skip link, consistent `:focus-visible` treatment, `aria-live` quiz
  announcements, semantic landmarks
- **Hardening**: strict CSP (self-only scripts/styles), security headers via `vercel.json`,
  immutable font caching, print stylesheet, branded 404

## Files

- `index.html` — content and structure
- `styles.css` — design system, themes, motion, print styles
- `script.js` — theme logic, scroll effects, cursor ribbon, cube engine and quiz
- `404.html` — branded error page
- `assets/` — fonts, icons, social preview card

## Run locally

Any static server works:

```bash
npx serve .
```

Design originally inspired by the dark editorial layout of lukeblom.fyi.
