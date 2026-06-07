# IndyHax 2026

Idea-agnostic hackathon starter built with React, TypeScript, and Vite.

## Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open the local URL printed by Vite.

## Commands

- `npm run dev` - start the development server
- `npm run test:watch` - run tests while coding
- `npm run check` - lint, test, build, and verify formatting
- `npm run format` - format the codebase

## When the idea arrives

1. Fill out [IDEA.md](./IDEA.md).
2. Put UI and feature code in `src/`.
3. Add public static files to `public/`.
4. Add browser-safe configuration as `VITE_*` values in `.env.local`.
5. Pick backend and deployment services only when the idea requires them.

Do not put secrets in `VITE_*` variables; Vite exposes them to the browser.
