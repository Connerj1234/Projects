# Daily Brief

Deployable daily morning brief tooling.

The active app lives in [`morning-brief`](morning-brief/). It is designed to run on the home server from cron, collect deterministic facts from configured public sources, ask the OpenAI API to write a concise plain-text brief, and email it through SMTP.

Current direction:

- Use the home server for scheduling and reliability.
- Use the OpenAI API with `gpt-5.4-mini` for the writing step.
- Keep all secrets in the server-local `morning-brief/.env`; never commit real API keys or SMTP passwords.
- Keep source collection deterministic. The model does not browse.

Useful docs:

- [`morning-brief/README.md`](morning-brief/README.md): setup, environment variables, cron, and systemd examples.
- [`docs/model-strategy.md`](docs/model-strategy.md): current API model choice and future subscription/local-model notes.
