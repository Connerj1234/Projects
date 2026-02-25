# Explain Anything Engine

## Overview

Explain Anything Engine is an interactive concept exploration tool designed to transform any topic into a structured, explorable knowledge system.

Instead of returning a static explanation, the app generates a living map of understanding:

* Multi-level explanations (from beginner to expert)
* A dynamic knowledge graph showing relationships between ideas
* Prerequisites and learning paths
* Misconceptions and analogies
* Interactive quiz generation
* Expandable concept exploration

The project emphasizes product design, visualization, and system architecture. While light data science techniques may be used to enhance relevance and structure, the goal is not model training but building an intelligent learning interface.

---

## Core Idea

Traditional explanations are linear. Understanding is not.

This project treats knowledge as a network:
Concepts connect.
Some ideas are foundational.
Some are frequently misunderstood.
Some unlock deeper learning.

The application visualizes those relationships so users can explore understanding the way it naturally develops.

---

## Key Feature: Interactive Knowledge Graph

The centerpiece of the app is a force-directed graph rendered using Cytoscape.js.

### Graph Behavior

* Nodes represent concepts.
* Edges represent relationships.
* Layout uses a physics-based simulation.
* Clusters form naturally around related ideas.
* Users can zoom, pan, drag, and expand nodes.
* Clicking a node reveals deeper context in a side panel.

### Node Types

Each node belongs to one of the following categories:

* Topic (root)
* Prerequisite
* Key Term
* Subtopic
* Misconception
* Example

### Edge Types

Edges describe semantic relationships:

* requires
* related_to
* part_of
* confused_with
* example_of

---

## Importance / Relevance Modeling

Node size reflects importance to the topic.

This is computed using lightweight scoring rather than training a model.

### Initial Rule-Based Scoring

Each node receives a score based on:

* Direct prerequisite of topic (+3)
* Referenced across multiple sections (+2)
* Number of incoming dependencies (+1 each)
* Distance from topic (-0.3 per hop)

Scores are normalized to a 1 to 10 scale and mapped to node size.

### Optional Upgrade: Embedding-Based Relevance

Later versions may compute semantic similarity using embeddings:
Relevance = cosine similarity(topic, node_description)

This allows more intelligent sizing without changing the app’s architecture.

---

## Feature Roadmap

### Iteration 1: Structured Explanation MVP

User inputs a topic.
System returns:

* ELI5 explanation
* Intermediate explanation
* Advanced explanation
* Expert explanation
* Glossary
* Analogies
* Common misconceptions

### Iteration 2: Knowledge Graph Integration

Model generates graph structure:

* 20–60 nodes
* Connected network centered on topic
* Typed relationships
  Graph is rendered with Cytoscape.

### Iteration 3: Prerequisite Learning Paths

Add:

* Ordered learning steps
* Dependency-aware study flow
* Optional graph filtering to show only prerequisites

### Iteration 4: Interactive Quiz Generation

Generate:

* 3 multiple-choice questions
* 2 short-answer questions
  Include explanations for answers.

### Iteration 5: Persistence and History

Allow:

* Saving explored topics
* Reopening past graphs
* Exporting to Markdown

---

## Optional Future Upgrades

These are intentionally deferred but documented for extensibility.

### Graph Expansion Mode

Clicking a node triggers:
"Explain this concept deeper."

System generates additional nodes connected only to that branch.

### Audience Adaptation

Users can select:

* Student
* Practitioner
* Executive
  This changes explanation depth and vocabulary.

### Diagram Generation

Render structured diagrams (Mermaid or similar) derived from the graph.

### Semantic Clustering

Automatically group related concepts into visual regions.

### Learning Progress Tracking

Mark nodes as understood.
Graph visually fades mastered concepts.

### Citation Mode

Provide source-backed explanations for research-oriented users.

---

## Technology Stack

Frontend:

* Next.js (App Router)
* TypeScript
* TailwindCSS

Visualization:

* Cytoscape.js (force-directed layout)

Backend:

* Next.js API routes

AI Integration:

* OpenAI API for structured generation

Storage (Initial):

* SQLite via Prisma

Possible Future Storage:

* Supabase or PostgreSQL

---

## Output Contract (Strict JSON Required)

All AI responses must follow a structured schema.

Top-Level Fields:

* topic
* explanations
* glossary
* analogies
* misconceptions
* prerequisites
* learningPath
* quiz
* graph

### Graph Schema

Nodes:

* id
* label
* type
* summary
* importance (optional)

Edges:

* id
* source
* target
* relation
* strength (optional)

Rules:

* Exactly one topic node.
* No isolated nodes.
* No duplicate IDs.
* Graph must remain connected.

---

## UI Layout

Top Section:
Topic input and generation controls.

Main Area:
Left: Graph visualization canvas.
Right: Node inspector panel.

Lower Tabs:
Explanations
Glossary
Misconceptions
Quiz

The visualization is the primary interface, not an accessory.

---

## Project Structure

src/

* app/
* api/generate/
* components/ConceptGraph.tsx
* components/NodeInspector.tsx
* lib/prompt.ts
* lib/schema.ts
* lib/graph.ts
* lib/db.ts

prisma/

* schema.prisma

---

## Environment Variables

Create `.env.local`:

OPENAI_API_KEY=your_key_here

Never commit this file.

---

## Acceptance Criteria

The application is considered functionally complete when:

* Any topic generates a connected knowledge graph.
* Nodes are draggable and interactive.
* Importance visibly affects node size.
* Clicking a node updates the inspector panel.
* Graph expansion works without breaking layout.
* Structured explanations remain synchronized with graph concepts.

---

## Design Philosophy

This project treats understanding as exploration, not consumption.

It blends:

* Knowledge modeling
* Visualization
* Human-centered interface design
* Lightweight semantic reasoning

The goal is to build a system that helps people navigate ideas rather than read about them.

---

## Status

Initial build focused on:
Structured generation + graph rendering.

Later enhancements will deepen interaction, not complexity.
