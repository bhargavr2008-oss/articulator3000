# The Articulator 3000

Turn a rough idea expressed through voice, typing, and air-drawing into a clear, shareable
concept page.

## Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open the local URL printed by Next.js.

## Commands

- `npm run dev` - start the development server
- `npm run test:watch` - run tests while coding
- `npm run check` - lint, test, build, and verify formatting
- `npm run format` - format the codebase

## Project docs

- [CONTEXT.md](./CONTEXT.md) explains the hackathon goals and scope.
- [SPEC.md](./SPEC.md) is the locked product specification.
- [PLAN.md](./PLAN.md) defines the risk-first implementation order.
- [TEAM_BRIEF.md](./TEAM_BRIEF.md) contains the demo and pitch guidance.

Keep `OPENAI_API_KEY` server-only. Do not put secrets in `NEXT_PUBLIC_*`
variables because Next.js exposes them to the browser.
