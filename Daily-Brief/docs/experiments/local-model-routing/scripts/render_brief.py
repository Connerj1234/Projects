#!/usr/bin/env python3
import argparse
import json
import sys
import urllib.error
import urllib.request


SYSTEM_PROMPT = """You write a concise personal morning brief.
Use only the supplied JSON facts. Do not invent games, forecasts, prices, events, or links.
Prefer concrete times, dates, source names, and why the item matters.
If a section has no useful data, omit it.
"""


def post_chat_completion(base_url, model, messages, api_key, timeout=180):
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.3,
    }
    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/chat/completions",
        data=data,
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        result = json.loads(response.read().decode("utf-8"))
        return result["choices"][0]["message"]["content"]


def main():
    parser = argparse.ArgumentParser(description="Render a morning brief from normalized JSON.")
    parser.add_argument("--base-url", required=True, help="Example: http://127.0.0.1:11434/v1")
    parser.add_argument("--model", required=True, help="Model id exposed by the provider.")
    parser.add_argument("--input", required=True, help="Path to normalized morning JSON.")
    parser.add_argument("--api-key", default="local", help="Bearer token. Ollama ignores this.")
    args = parser.parse_args()

    with open(args.input, "r", encoding="utf-8") as handle:
        facts = json.load(handle)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": "Render this into a morning brief:\n\n"
            + json.dumps(facts, indent=2, sort_keys=True),
        },
    ]

    try:
        print(post_chat_completion(args.base_url, args.model, messages, args.api_key))
    except urllib.error.HTTPError as exc:
        print(f"http_error: {exc.code} {exc.reason}", file=sys.stderr)
        print(exc.read().decode("utf-8", errors="replace"), file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"render_failed: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

