from __future__ import annotations

import html
import re


BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
LINK_RE = re.compile(r"\[([^\]]+)\]\((https?://[^)]+)\)")


def markdown_to_html(text: str) -> str:
    lines = text.splitlines()
    body: list[str] = []
    in_list = False

    for raw_line in lines:
        line = raw_line.rstrip()
        if not line:
            if in_list:
                body.append("</ul>")
                in_list = False
            continue

        if line.startswith("### "):
            if in_list:
                body.append("</ul>")
                in_list = False
            body.append(f"<h3>{format_inline(line[4:])}</h3>")
            continue

        if line.startswith("## "):
            if in_list:
                body.append("</ul>")
                in_list = False
            body.append(f"<h2>{format_inline(line[3:])}</h2>")
            continue

        if line.startswith("# "):
            if in_list:
                body.append("</ul>")
                in_list = False
            body.append(f"<h1>{format_inline(line[2:])}</h1>")
            continue

        if line.startswith("- ") or line.startswith("* "):
            if not in_list:
                body.append("<ul>")
                in_list = True
            body.append(f"<li>{format_inline(line[2:])}</li>")
            continue

        if in_list:
            body.append("</ul>")
            in_list = False
        body.append(f"<p>{format_inline(line)}</p>")

    if in_list:
        body.append("</ul>")

    return HTML_TEMPLATE.format(body="\n".join(body))


def format_inline(text: str) -> str:
    parts: list[str] = []
    cursor = 0
    for match in LINK_RE.finditer(text):
        parts.append(format_bold(text[cursor:match.start()]))
        label = format_bold(match.group(1))
        url = html.escape(match.group(2), quote=True)
        parts.append(f'<a href="{url}" target="_blank" rel="noopener noreferrer">{label}</a>')
        cursor = match.end()
    parts.append(format_bold(text[cursor:]))
    return "".join(parts)


def format_bold(text: str) -> str:
    return BOLD_RE.sub(r"<strong>\1</strong>", html.escape(text))


HTML_TEMPLATE = """<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body {{
        color: #202124;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 15px;
        line-height: 1.45;
        margin: 0;
        padding: 0;
      }}
      h1 {{
        font-size: 24px;
        margin: 0 0 18px;
      }}
      h2 {{
        border-bottom: 1px solid #e5e7eb;
        font-size: 18px;
        margin: 24px 0 8px;
        padding-bottom: 4px;
      }}
      h3 {{
        font-size: 15px;
        margin: 16px 0 6px;
      }}
      p {{
        margin: 0 0 12px;
      }}
      ul {{
        margin: 0 0 14px 20px;
        padding: 0;
      }}
      li {{
        margin: 0 0 6px;
      }}
      strong {{
        font-weight: 700;
      }}
      a {{
        color: #1c5b47;
        text-decoration: underline;
      }}
    </style>
  </head>
  <body>
    {body}
  </body>
</html>
"""
