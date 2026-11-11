# Catchin' Sunsets

One-page site for the Catchin' Sunsets rooftop party series: a scroll-driven sunset over the Portland skyline (planes overhead, seen from a rooftop with string lights), the experience, the crowd, and a newsletter signup.

Plain HTML, CSS and JavaScript. No build step. Signups are handled by a Cloudflare Pages Function.

```
catchin-sunsets/
├── public/                  ← what Cloudflare serves (build output directory)
│   ├── index.html
│   ├── thanks.html          ← shown after signup when JavaScript is off
│   ├── favicon.svg
│   ├── robots.txt
│   ├── _headers             ← security + cache headers
│   └── assets/
│       ├── css/styles.css
│       ├── js/main.js       ← hero animation, photo rows, signup form
│       └── img/             ← crowd photos, logo, og-image.jpg (link preview)
├── functions/
│   └── api/
│       ├── subscribe.js     ← POST /api/subscribe  (saves signups)
│       └── export.js        ← GET  /api/export     (download signups as CSV)
├── package.json             ← optional: local dev + CLI deploy with Wrangler
└── .dev.vars.example
```

## 1. Put it on GitHub

```bash
cd catchin-sunsets
git init
git add .
git commit -m "Catchin' Sunsets site"
git branch -M main
git remote add origin https://github.com/<your-account>/catchin-sunsets.git
git push -u origin main
```

(Or create the repo on github.com first and upload the folder contents.)

## 2. Connect Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Pick the `catchin-sunsets` repo.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: **`public`**
4. **Save and Deploy.** The `functions/` folder is picked up automatically.

Every push to `main` redeploys. Other branches get preview URLs.

## 3. Turn on signups

The form posts to `/api/subscribe`. Until storage is connected it answers "Signups open soon", so nothing is ever silently lost.

**Store signups in Cloudflare KV (recommended, free tier is plenty):**

1. **Workers & Pages → KV → Create namespace**, name it `catchin-sunsets-signups`.
2. Your Pages project → **Settings → Bindings → Add → KV namespace**.
   Variable name: **`SIGNUPS`**, namespace: `catchin-sunsets-signups`. Add it for Production (and Preview if you want).
3. **Settings → Variables and Secrets → Add**: type **Secret**, name **`ADMIN_TOKEN`**, value: a long random password.
4. Redeploy (Deployments → ⋯ → Retry deployment).

Download everyone who signed up any time:

```
https://<your-site>/api/export?token=<ADMIN_TOKEN>
```

That gives a CSV (email, first name, city, signup date, visitor city/country) you can import into Mailchimp, Beehiiv, Kit or a spreadsheet.

**Also send each signup to your newsletter tool (optional):**
Add a variable **`WEBHOOK_URL`** pointing at a Zapier/Make webhook (or any endpoint that accepts JSON). Each signup is POSTed there as:

```json
{ "email": "you@example.com", "first_name": "Tia", "city": "Atlanta", "age_21": true,
  "signed_up_at": "2026-11-11T21:56:30.900Z", "visitor_country": "US", "visitor_city": "Dallas",
  "source": "catchin-sunsets-site" }
```

From there, the automation can add them to your audience. `WEBHOOK_URL` works on its own too, without KV.

## 4. Custom domain

Pages project → **Custom domains → Set up a domain** (e.g. `catchinsunsets.com`). If the domain is on Cloudflare, DNS is set up for you.

## Local development (optional)

Needs Node 18+.

```bash
npm install
cp .dev.vars.example .dev.vars   # local ADMIN_TOKEN
npm run dev                      # http://localhost:8788 with a local SIGNUPS store
```

Deploy from your machine instead of Git: `npx wrangler login`, then `npm run deploy`.

## Editing

- **Copy:** `public/index.html`.
- **Colors and type:** the tokens at the top of `public/assets/css/styles.css`.
- **Photos:** replace files in `public/assets/img/` (864×1080 JPG works well) and update the `<img>` tags.
- **Hero:** `public/assets/js/main.js`. `LANDMARKS` sets the Portland towers (KOIN Center, Wells Fargo Center, Big Pink); `PLANES` sets the flight paths; `buildRooftop` draws the railing and string lights; `K` holds the sky colors from golden hour to dusk.
- **City suggestions in the form:** the `<datalist id="cities">` in `index.html`.

Photos by @neverkaptured.
