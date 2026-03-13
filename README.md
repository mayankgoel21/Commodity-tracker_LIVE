# Commodity & FX Tracker — Netlify Deployment

Two fully automated dashboards, both updating on the **1st and 15th of every month**.

## Live URLs (after deploy)
- `https://your-site.netlify.app/` → Commodity price tracker
- `https://your-site.netlify.app/fx.html` → FX tracker (INR · USD · CNY)

---

## Repo structure
```
commodity-tracker/
├── netlify.toml                     ← build config + cron schedules
├── package.json                     ← dependencies
├── public/
│   ├── index.html                   ← commodity dashboard
│   └── fx.html                      ← FX dashboard
└── netlify/
    └── functions/
        ├── fetch-prices.mjs         ← scheduled: commodity prices (IMF)
        ├── prices.mjs               ← API: /api/prices
        ├── fetch-fx.mjs             ← scheduled: FX rates (Frankfurter)
        └── fx-prices.mjs            ← API: /api/fx-prices
```

## Deploy

1. Push all files to GitHub maintaining the folder structure above
2. Netlify → Add new site → Import from GitHub → select repo → Deploy
3. Netlify auto-detects settings from `netlify.toml`

## First run — trigger both functions manually

After deploy, go to Netlify dashboard → **Functions** tab and trigger both once:
- `fetch-prices` → populates commodity data
- `fetch-fx` → populates FX rate data

After that both run automatically forever.

## Sharing

Just share the URLs — no login, no install, no file to download.
Everyone on your team opens the same live dashboard.

## Data sources

| Function | API | Cost |
|---|---|---|
| fetch-prices | IMF PCPS (LME benchmarks) | Free, no key |
| fetch-fx | Frankfurter API (ECB data) | Free, no key |

## Free tier usage

- Netlify functions: ~4 invocations/month (125,000 limit)
- Netlify Blobs: ~20KB storage (1GB limit)
- Both APIs: unlimited, no auth

**Total cost: $0/month**
