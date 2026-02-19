# Atlanta United Fan Hub

## Rolling Data Updates

The site reads dashboard values from `data.js`.

- Run `npm run update-data` to refresh fixtures, next match, results, and standings.
- Data source is ESPN's public site API endpoints.
- A GitHub Actions workflow (`.github/workflows/update-data.yml`) runs daily and can be triggered manually.
- Historical timeline and season archive remain curated static data.
