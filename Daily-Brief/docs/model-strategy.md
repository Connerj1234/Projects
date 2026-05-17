# Model Strategy

## Current Setup

The morning brief currently uses the OpenAI API, not a ChatGPT subscription.

The server runs `morning-brief/run_brief.py` from cron. The script fetches weather, sports, news RSS, and holiday facts itself, writes the facts to JSON, then sends that JSON to the OpenAI Responses API. The model's job is to turn known facts into a concise plain-text email.

Default model:

```env
OPENAI_MODEL=gpt-5.4-mini
```

This is the right default for now because the task is constrained summarization and prioritization over already-fetched facts. A larger model may write slightly better prose, but it is unlikely to change the core usefulness until the app has richer personal context.

## Subscription Versus API

A ChatGPT subscription is useful for interactive chat, but it is not the same as API billing and is not the natural fit for a server cron job. The server needs a programmatic endpoint that can run unattended every morning, which is what the API provides.

If subscription-based automation becomes practical later, evaluate it separately. The key questions will be:

- Which model is actually used by the subscription automation path?
- Can it run unattended on the home server without browser/session fragility?
- Does it expose usage limits clearly enough for a daily scheduled job?
- Can it receive the same deterministic facts JSON without browsing or inventing data?

For now, keep the production path API-based and inexpensive.

## When To Revisit

Consider a stronger model or a different execution path if the app adds:

- Gmail triage.
- Calendar interpretation.
- Portfolio or earnings analysis.
- Multi-source contradiction handling.
- True web search or research tasks.
- Personalized prioritization across private data.

Until then, improving collectors, source selection, and prompt structure will matter more than using a larger model.
