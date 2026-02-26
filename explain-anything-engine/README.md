# Explain Anything Engine

Interactive concept exploration tool that turns any topic into:
- Multi-level explanations (ELI5 to expert)
- A connected knowledge graph
- Misconceptions, analogies, glossary, prerequisites

## Current Scope (v0)
This repository now includes a working MVP scaffold:
- Next.js app (`src/app/page.tsx`)
- API route for generation (`src/app/api/generate/route.ts`)
- Strict output schema + validation (`src/lib/schema.ts`)
- Interactive graph visualization with Cytoscape (`src/components/ConceptGraph.tsx`)
- Node inspector panel (`src/components/NodeInspector.tsx`)
- Mock generator fallback when no API key is set (`src/lib/mockData.ts`)

## Product Contract
All generated content must validate against this shape:
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

## Run Locally
1. Install dependencies:
```bash
npm install
```
2. Add environment variables:
```bash
cp .env.example .env.local
```
3. Run dev server:
```bash
npm run dev
```
4. Open `http://localhost:3000`

## Environment Variables
```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-nano
OPENAI_FALLBACK_MODELS=gpt-4.1-mini
```
If `OPENAI_API_KEY` is missing, the app serves deterministic mock data so UI development can continue.

## Build Plan
### Milestone 1 (done)
- Topic input + generate flow
- Strict schema validation
- Connected graph rendering
- Node inspector
- Tabs for explanations/glossary/misconceptions

### Milestone 2 (next)
- Stronger prompt + structured output mode
- Better graph density (20-60 nodes)
- Regeneration and branch expansion from selected node

### Milestone 3
- Persistence via Prisma + SQLite
- Topic history + reload
- Markdown export

## Suggested File Ownership
- `src/app/page.tsx`: UI orchestration
- `src/app/api/generate/route.ts`: generation and response guarantees
- `src/lib/schema.ts`: canonical contract
- `src/lib/graph.ts`: graph quality checks and importance defaults
- `src/lib/prompt.ts`: LLM instruction strategy

## Definition of Done (v1)
- Any topic generates a valid, connected graph
- Graph is draggable/zoomable and node-click updates inspector
- Explanation tabs stay synchronized with graph topic
- API response always passes contract validation
- Basic persistence for previously generated topics
