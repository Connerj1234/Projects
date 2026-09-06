# Portfolio Handoff: Add Daily Brief to Personal Projects

## Objective

Add **Daily Brief** to the **Personal** tab of the “Selected work” section on [connerjamison.com](https://connerjamison.com), using the existing Atlanta United Hub card as the visual and interaction reference.

This is a content and presentation update to the portfolio site. Do not copy implementation details, secrets, or deployment configuration from the Daily Brief repository into the portfolio codebase.

## Source of Truth

- Project repository: <https://github.com/Connerj1234/Projects/tree/main/Daily-Brief>
- Project overview: <https://github.com/Connerj1234/Projects/blob/main/Daily-Brief/README.md>
- Detailed setup and architecture: <https://github.com/Connerj1234/Projects/blob/main/Daily-Brief/morning-brief/README.md>

The project is a private-use automation rather than a public web application, so it currently has no live demo URL.

## Requested Placement

- Section: **Projects / Selected work**
- Tab: **Personal**
- Add it as a separate project card alongside Atlanta United Hub.
- Preserve the section’s existing typography, spacing, borders, colors, hover/focus treatments, and responsive behavior.
- Follow the site’s established ordering convention. If there is no explicit convention, place Daily Brief after Atlanta United Hub.

## Approved Card Copy

### Preferred concise version

**Title**

Daily Brief

**Description**

Automated morning briefing that gathers weather, Atlanta sports, markets, traffic, and news, then uses grounded AI summarization to deliver a concise daily email.

### Shorter fallback

Use this only if the card layout needs tighter copy:

> Automated morning brief combining weather, sports, markets, traffic, and news into one concise, AI-written daily email.

### Optional technology labels

If the project-card component already supports technology labels, use:

- Python
- OpenAI API
- Automation
- RSS

Do not introduce a new label treatment solely for this card.

## Links and Buttons

- Primary button: **GitHub**
- URL: <https://github.com/Connerj1234/Projects/tree/main/Daily-Brief>
- Open external links using the portfolio’s existing behavior. If links open in a new tab, include the same security and accessibility attributes used elsewhere on the site.
- Do **not** show a **Website** or **Live Demo** button. The application runs unattended on a home server and delivers its output by email; it does not have a public UI.
- Do not link to the server, cron job, email inbox, OpenAI API endpoint, or any local output file.

## Project Image

Use a real, redacted screenshot of the generated email as the preferred card image. A desktop email view with the title and several representative sections visible will explain the project more accurately than a fabricated dashboard.

Before publishing the image:

- Remove or obscure sender and recipient email addresses, account avatars, inbox contents, notification badges, and other personal information.
- Avoid showing API keys, SMTP details, server paths, precise residential location data, or raw configuration.
- Keep representative content such as the morning brief heading, weather, sports, market watchlist, and news section labels.
- Crop to a wide composition that fits the same image area and visual weight as the existing Atlanta United Hub card.
- Compress the final asset appropriately and provide meaningful alt text.

Suggested alt text:

> Daily Brief email showing weather, sports, markets, and news summaries

If a safe screenshot is not available, use an on-brand static composition based on an email/document interface. Do not imply that the project has a public dashboard.

## Accurate Project Details

Use these facts if more copy is needed for an expanded card, modal, project detail page, metadata, or accessibility context:

- A Python automation scheduled to run every morning at **7:30 AM Eastern** on a home server, with daylight-saving changes handled automatically.
- Collects facts from public sources before any model call; the model itself does not browse.
- Covers National Weather Service forecasts and alerts, followed Atlanta teams and major sporting events via ESPN scoreboard data, market watchlist data, local and general news, traffic/commute headlines, tech/AI news, and upcoming U.S. holidays.
- Sends a multipart email with a styled HTML version and a plain-text alternative.
- Uses the OpenAI Responses API to prioritize and summarize only the collected facts.
- Saves the collected fact set and rendered brief locally for traceability.
- Includes a deterministic fallback renderer when the OpenAI step is not configured.
- Uses Python’s standard library only; there are no third-party runtime packages.
- Is configurable through JSON and environment variables, with secrets kept outside version control.
- Supports cron and systemd scheduling examples.

## Suggested Expanded Description

Use only if the portfolio supports a longer project view:

> Daily Brief is a server-run Python automation that assembles a personalized morning email from deterministic public data sources. It collects local weather and alerts, Atlanta sports schedules, market movements, traffic and news headlines, technology updates, and upcoming holidays. The collected facts are passed to the OpenAI Responses API with instructions to summarize only the supplied data, reducing unsupported claims while keeping the result concise. The system sends both HTML and plain-text email, saves source facts for traceability, and includes a deterministic renderer for use when the AI step is not configured.

## Engineering Themes to Emphasize

If space allows, prioritize these themes over a long list of APIs:

1. **Reliable automation:** unattended, time-zone-aware daily operation on a home server.
2. **Grounded AI:** deterministic collection first, constrained summarization second.
3. **Fallback path:** the brief can still render when the AI step is not configured.
4. **Practical delivery:** styled HTML email plus a plain-text alternative.
5. **Privacy-aware configuration:** credentials remain in server-local environment variables.

## Claims to Avoid

- Do not call this a web app, dashboard, mobile app, or real-time feed.
- Do not say the model independently researches or browses the web.
- Do not claim Gmail, calendar, reminder, portfolio-account, Discord, or Pushover integrations; those are future ideas, not current features.
- Do not say the service is publicly hosted or available for other users.
- Do not expose personal email addresses, credentials, local filesystem paths, home-server details, or precise residential coordinates.
- Do not present every configured feed as guaranteed to be available at all times; upstream failures are handled but still possible.

## Responsive and Accessibility Requirements

- Match the existing card semantics and heading hierarchy.
- The project image must have descriptive alt text and should not contain essential information that is unavailable in nearby text.
- The GitHub control must remain keyboard accessible and have a visible focus state.
- Maintain sufficient text, border, and interactive-control contrast.
- Confirm that the title, description, button, and image do not clip or overflow at the site’s existing mobile, tablet, and desktop breakpoints.
- If cards stack on smaller screens, preserve a sensible reading order: title, description, action, image—or the site’s current established order.

## Acceptance Criteria

- Daily Brief appears only in the **Personal** project list.
- Its presentation is visually consistent with the existing Atlanta United Hub card.
- The approved title and one of the approved descriptions are used without adding unsupported claims.
- The GitHub button resolves to the Daily Brief directory in the Projects repository.
- No Website or Live Demo button is shown unless a real public experience is added later.
- The image is optimized, redacted, responsive, and has appropriate alt text.
- No credentials, personal identifiers, local paths, server access information, or precise residential coordinates are exposed.
- The card works with keyboard navigation and at all existing responsive breakpoints.
- Existing Professional/Personal tab behavior and other project cards remain unchanged.

## Deliverables

1. Portfolio code change adding the Daily Brief personal-project entry.
2. Optimized and redacted project image asset.
3. Verification of the GitHub link, tab filtering, keyboard behavior, and responsive layout.
4. A brief implementation summary naming the files changed and any assumptions made.
