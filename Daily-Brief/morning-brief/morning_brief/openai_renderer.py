from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any


SYSTEM_PROMPT = """You write a personal morning brief email.

Rules:
- Use only the supplied JSON facts.
- Do not invent games, weather, prices, events, holidays, or links.
- Lead with what matters today, then organize by section.
- Mention source names when useful.
- Keep it concise enough to read in 3 minutes.
- If a source failed or a section has no useful data, state that briefly only when it matters.
- Use plain text, not Markdown tables.
- End with the final brief item. Do not add offers, follow-up questions, or assistant-style closing lines.
"""


def render_with_openai(facts: dict[str, Any], model: str, api_key: str) -> str:
    payload = {
        "model": model,
        "input": [
            {
                "role": "system",
                "content": [{"type": "input_text", "text": SYSTEM_PROMPT}],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": "Write today's morning brief from these facts:\n\n"
                        + json.dumps(facts, indent=2, sort_keys=True),
                    }
                ],
            },
        ],
        "max_output_tokens": 1800,
    }
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI API error {exc.code}: {detail}") from exc

    text = extract_response_text(result)
    if not text:
        raise RuntimeError("OpenAI response did not contain output text")
    return text.strip()


def extract_response_text(result: dict[str, Any]) -> str:
    if isinstance(result.get("output_text"), str):
        return result["output_text"]

    parts: list[str] = []
    for item in result.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text" and content.get("text"):
                parts.append(content["text"])
    return "\n".join(parts)
