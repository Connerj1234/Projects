from __future__ import annotations

import html
import re


BOLD_RE = re.compile(r"\*\*(.+?)\*\*")


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
    escaped = html.escape(text)
    return BOLD_RE.sub(r"<strong>\1</strong>", escaped)


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
    </style>
  </head>
  <body>
    {body}
  </body>
</html>
"""
