# Morning Brief Architecture

The durable version should run on the home server, but it should not depend on the home server's GPU for every step.

## Phase 1: Model Renderer Only

Use a static JSON file and render it with a local model:

```bash
python3 scripts/render_brief.py \
  --base-url http://HOME_SERVER_OR_PC_IP:11434/v1 \
  --model qwen2.5-coder:7b \
  --input sample_morning_input.json
```

This proves the model endpoint, prompt shape, and output style.

## Phase 2: Deterministic Collectors

Build collectors that output the same JSON shape:

| Collector | First source |
| --- | --- |
| Weather | weather.gov / NWS API |
| Sports | ESPN/team schedules or a paid sports API |
| Stocks | yfinance for hobby use, Polygon/IEX for reliability |
| News | RSS feeds and search APIs with source links |
| Calendar | Google Calendar API or `.ics` feed |

Each collector should save raw responses and normalized facts. The model only sees normalized facts.

## Phase 3: Delivery

Use one delivery target first:

| Target | Notes |
| --- | --- |
| Email via SMTP/Resend/Postmark | Best first daily brief format. |
| Discord webhook | Easiest for debugging. |
| Pushover | Good for phone notifications. |
| SMS | Useful, but too cramped for the full brief. |

## Phase 4: Router

Add a tiny routing policy:

```text
if gaming PC endpoint is awake:
  use gaming model
else if home server local endpoint is healthy:
  use home model
else:
  use cheap hosted model
```

This gives you a reliable daily brief without forcing the gaming PC to stay on overnight.

## Phase 5: News Quality

News is where hallucinations and low-quality ranking creep in. Treat source selection as code and data, not model magic:

- Prefer RSS/source lists first.
- Keep source URLs in every item.
- Deduplicate by canonical URL and headline similarity.
- Rank by topic preferences, source trust, recency, and novelty.
- Ask the model only to summarize and explain importance.

