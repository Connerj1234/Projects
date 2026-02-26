# Explain Anything Engine

Interactive concept exploration tool that turns any topic into:
- Multi-level explanations (ELI5 to expert)
- A connected knowledge graph
- Misconceptions, analogies, glossary, prerequisites
- Anonymous topic history (no OAuth required)

## Current Scope (v0)
This repository includes a working scaffold with:
- Next.js app UI (`src/app/page.tsx`)
- Generation API (`src/app/api/generate/route.ts`)
- History API (`src/app/api/history/route.ts`)
- Strict output schema + validation (`src/lib/schema.ts`)
- Graph visualization with Cytoscape (`src/components/ConceptGraph.tsx`)
- Node inspector with contextual summary (`src/components/NodeInspector.tsx`)
- Prisma + SQLite persistence (`prisma/schema.prisma`)

## Product Contract
All generated content must validate against:
- `topic`
- `explanations` (`eli5`, `intermediate`, `advanced`, `expert`)
- `glossary`
- `analogies`
- `misconceptions`
- `prerequisites`
- `learningPath`
- `graph` (`nodes`, `edges`)

Graph rules enforced:
- Exactly one `Topic` node
- No duplicate IDs
- Edge references must point to existing nodes
- Graph must be connected
- Importance values normalized to `1..10`

## Architecture
- Frontend: Next.js App Router + TypeScript + TailwindCSS
- Graph: Cytoscape.js
- AI: OpenAI API (optional, with mock fallback)
- Validation: Zod
- Persistence: Prisma + SQLite

## Run Locally
1. Install dependencies:
```bash
npm install
```
2. Add environment variables:
```bash
cp .env.example .env.local
```
3. Generate Prisma client:
```bash
npm run prisma:generate
```
4. Create/update SQLite schema:
```bash
npm run prisma:push
```
5. Run dev server:
```bash
npm run dev
```
6. Open `http://localhost:3000`

## Environment Variables
```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-nano
OPENAI_FALLBACK_MODELS=gpt-4.1-mini
DATABASE_URL=file:./dev.db
```

## Anonymous History (No OAuth)
- Client stores an `anon_client_id` cookie.
- Each generation is saved in `TopicHistory` keyed by that cookie.
- History appears in the UI as reloadable topic cards.

## Generation Reliability
Generation uses a shape-first strategy:
1. Generate a connected graph shape first.
2. Generate explanations/glossary/etc against that fixed graph.
3. Validate and normalize output.
4. Retry/repair and fallback model if needed.

## Graph Controls
- Node type filters (Topic, Prerequisite, Key Term, etc.)
- Label density toggle (compact/balanced/expanded)
- Fit/reset layout button

## Tests
Run:
```bash
npm test
```
Covers:
- Graph connectivity checks
- Schema acceptance/rejection rules (including duplicate IDs and topic-node constraints)

## Suggested File Ownership
- `src/app/page.tsx`: UI orchestration + history integration
- `src/app/api/generate/route.ts`: generation strategy + validation
- `src/app/api/history/route.ts`: history persistence API
- `src/lib/schema.ts`: canonical contract
- `src/lib/graph.ts`: graph quality checks and importance defaults

## Definition of Done (v1)
- Any topic generates a valid, connected graph
- Graph is draggable/zoomable and node-click updates inspector
- Explanation tabs stay synchronized with graph topic
- API response always passes contract validation
- Anonymous history persists and can reload past outputs
