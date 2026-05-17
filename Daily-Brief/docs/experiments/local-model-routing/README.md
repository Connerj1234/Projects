# Local Model Routing Starter

This folder is a practical starting point for two goals:

1. Route Codex to local or cheaper OpenAI-compatible model endpoints.
2. Reuse the same endpoint shape later for a morning brief renderer.

It avoids global config changes until you have a working endpoint.

## Recommended Machine Roles

Use the machines this way:

| Machine | Best role | Why |
| --- | --- | --- |
| MacBook Pro M5 Pro, 24 GB unified memory | Interactive experiments and medium local models | Fastest day-to-day machine, but not ideal as a 24/7 service. |
| Gaming PC, RTX 3080 10 GB + 32 GB RAM | Long `/goal` sessions while you keep using the laptop | Best CUDA box, good for 7B/8B models and some quantized 14B models. |
| Home server, GTX 1660 Ti 6 GB + 16 GB RAM | Always-on router, schedulers, brief pipeline, small local model fallback | Stable 24/7 host, but limited for serious coding-agent models. |

The clean architecture is:

```text
laptop Codex CLI
  -> OpenAI-compatible model endpoint on LAN
     -> gaming PC when awake for heavier coding work
     -> home server for always-on small tasks
     -> cheap hosted provider as fallback
```

## Start With Ollama

Ollama is the simplest first target because it exposes an OpenAI-compatible API.

On the model host:

```bash
ollama serve
ollama pull qwen2.5-coder:7b
```

For LAN access, set Ollama to listen beyond localhost. Do this only on your private LAN, ideally behind a firewall:

```bash
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

Then from the laptop:

```bash
python3 scripts/test_openai_endpoint.py \
  --base-url http://HOME_SERVER_OR_PC_IP:11434/v1 \
  --model qwen2.5-coder:7b
```

If that works, Codex can usually talk to the same endpoint.

## Codex Profile Snippet

Do not paste this blindly. Replace IPs and model names first, then add the relevant profiles to `~/.codex/config.toml`.

```toml
[model_providers.home_ollama]
name = "Home Ollama"
base_url = "http://HOME_SERVER_IP:11434/v1"
wire_api = "chat"

[model_providers.gaming_ollama]
name = "Gaming PC Ollama"
base_url = "http://GAMING_PC_IP:11434/v1"
wire_api = "chat"

[profiles.home-local]
model_provider = "home_ollama"
model = "qwen2.5-coder:7b"
model_reasoning_effort = "low"

[profiles.gaming-local]
model_provider = "gaming_ollama"
model = "qwen2.5-coder:7b"
model_reasoning_effort = "medium"
```

Test Codex:

```bash
codex exec --profile home-local --skip-git-repo-check "Say hello and name the model you are running on."
```

For interactive work:

```bash
codex --profile gaming-local
```

## Enabling `/goal`

`/goal` is experimental in Codex. Enable it with:

```toml
[features]
goals = true
```

Then start a local-model session and set the goal:

```bash
codex --profile gaming-local
```

Inside Codex:

```text
/goal Finish the requested implementation and keep tests passing
```

Use the gaming PC for this first. The home server can host a small model, but the 1660 Ti and 16 GB RAM will be frustrating for long agentic coding tasks.

## Model Suggestions By Machine

Start conservative:

| Machine | First model to test | Notes |
| --- | --- | --- |
| Home server, 1660 Ti 6 GB | `qwen2.5-coder:7b` Q4 or smaller | Good for short edits/summaries, weak for long autonomous work. |
| Gaming PC, 3080 10 GB | `qwen2.5-coder:7b`, `qwen3:8b`, maybe 14B Q4 | Best first target for `/goal`; monitor VRAM/context. |
| MacBook, 24 GB unified | Qwen coder 14B/30B-class quantized experiments | Good for testing, but avoid making it the always-on service. |

Once the routing works, benchmark a few prompts before trusting any model with multi-hour work.

## Morning Brief Direction

For the morning brief, do not make the model browse. Make code fetch structured data, then ask a model to write the brief from that data.

Flow:

```text
home server cron
  -> collectors fetch weather, sports, markets, RSS/news, calendar
  -> normalized JSON with links and timestamps
  -> local/cheap model renders concise brief
  -> email/push delivery
```

Use `scripts/render_brief.py` as the smallest proof of concept.

