# Deploying the MLS Results UI

## Local preview
From the repo root:

```bash
python3 -m http.server 8000 --directory site
```

Then open `http://localhost:8000`.

## Option 1: Netlify (best fit if your portfolio is already there)

### Drag-and-drop (fastest)
1. In this repo, zip the `site/` folder.
2. In Netlify, go to Sites -> Add new site -> Deploy manually.
3. Drop the zip file.

### Git-connected deploy (recommended)
1. Push this repo to GitHub.
2. In Netlify, Add new site -> Import from Git.
3. Build settings:
   - Build command: *(leave empty)*
   - Publish directory: `site`
4. Deploy.

`netlify.toml` is already included with `publish = "site"`.

## Option 2: GitHub Pages (free)
1. Push repo to GitHub.
2. Settings -> Pages.
3. Source: Deploy from a branch.
4. Branch: `main` (or your branch), folder: `/site`.

## Option 3: Cloudflare Pages (free)
1. Create a new Pages project from GitHub.
2. Framework preset: None.
3. Build command: *(none)*
4. Output directory: `site`.

## Option 4: Vercel (free hobby tier)
1. Import GitHub repo.
2. Framework preset: Other.
3. Build command: *(none)*
4. Output directory: `site`.

## Cost notes (as of Feb 17, 2026)
- Netlify, GitHub Pages, Cloudflare Pages, and Vercel all have free tiers suitable for a static showcase page.
- Free tiers include bandwidth/build limits; this project is lightweight and should fit comfortably unless traffic spikes heavily.
