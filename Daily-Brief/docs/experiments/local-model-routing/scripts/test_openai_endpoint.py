#!/usr/bin/env python3
import argparse
import json
import sys
import urllib.error
import urllib.request


def request_json(url, method="GET", payload=None, api_key="local", timeout=120):
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        body = response.read().decode("utf-8")
        return json.loads(body)


def main():
    parser = argparse.ArgumentParser(description="Test an OpenAI-compatible model endpoint.")
    parser.add_argument("--base-url", required=True, help="Example: http://127.0.0.1:11434/v1")
    parser.add_argument("--model", required=True, help="Model id exposed by the provider.")
    parser.add_argument("--api-key", default="local", help="Bearer token. Ollama ignores this.")
    parser.add_argument("--prompt", default="Reply with one short sentence confirming you can answer.")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    try:
        models = request_json(f"{base_url}/models", api_key=args.api_key)
        model_ids = [item.get("id") for item in models.get("data", []) if item.get("id")]
        print("models_ok:", ", ".join(model_ids[:10]) or "no model ids returned")

        payload = {
            "model": args.model,
            "messages": [
                {"role": "system", "content": "You are a concise endpoint health-check assistant."},
                {"role": "user", "content": args.prompt},
            ],
            "temperature": 0.2,
        }
        completion = request_json(
            f"{base_url}/chat/completions",
            method="POST",
            payload=payload,
            api_key=args.api_key,
        )
        text = completion["choices"][0]["message"]["content"]
        print("chat_ok:", text.strip())
    except urllib.error.HTTPError as exc:
        print(f"http_error: {exc.code} {exc.reason}", file=sys.stderr)
        print(exc.read().decode("utf-8", errors="replace"), file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"endpoint_failed: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

