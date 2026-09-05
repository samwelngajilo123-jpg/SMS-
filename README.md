# Africa's Talking SMS — Netlify Ready

Send and receive SMS using the Africa's Talking API, deployed as Netlify Functions.

## What's inside

```
at-sms-netlify/
├── netlify.toml                       # Netlify build/functions config
├── package.json
├── .env.example                       # copy to .env / set in Netlify UI
├── public/
│   └── index.html                     # simple test page to send SMS
└── netlify/functions/
    ├── send-sms.js                    # POST -> sends an SMS
    ├── inbound-sms.js                 # webhook: receives incoming SMS
    └── delivery-report.js             # webhook: receives delivery status
```

## 1. Get Africa's Talking credentials

1. Sign up at https://account.africastalking.com/ (use **Sandbox** for free testing).
2. Grab your **Username** (`sandbox` for the sandbox app) and **API Key**.
3. In the sandbox, add a test phone number under Settings > Simulator to receive real SMS while testing.

## 2. Configure environment variables

Copy `.env.example` to `.env` for local dev:

```bash
cp .env.example .env
```

Fill in:
- `AT_USERNAME` — your AT username (`sandbox` or your live app username)
- `AT_API_KEY` — your API key
- `AT_SENDER_ID` — optional, your approved shortcode/sender ID (leave blank for sandbox)
- `SEND_SMS_SECRET` — optional shared secret to protect the send endpoint

**On Netlify**, don't upload `.env` — instead set these same variables under:
Site settings > Environment variables.

## 3. Install & run locally

```bash
npm install
npm install -g netlify-cli   # if you don't have it
netlify dev
```

This serves `public/index.html` and your functions at `http://localhost:8888`.

## 4. Deploy to Netlify

**Option A — CLI**
```bash
netlify deploy --prod
```

**Option B — Git**
1. Push this folder to a GitHub repo.
2. In Netlify: "Add new site" > "Import an existing project" > pick the repo.
3. Build command: `npm install` — Publish directory: `public` — Functions directory: `netlify/functions` (already set in `netlify.toml`).
4. Add the environment variables from step 2 in the Netlify dashboard.
5. Deploy.

## 5. Wire up Africa's Talking callbacks

In your AT dashboard, under your app's **SMS** settings:
- **Callback URL** (incoming SMS): `https://<your-site>.netlify.app/.netlify/functions/inbound-sms`
- **Delivery Report Callback URL**: `https://<your-site>.netlify.app/.netlify/functions/delivery-report`

## 6. Test sending

Visit `https://<your-site>.netlify.app/` and use the form, or:

```bash
curl -X POST https://<your-site>.netlify.app/.netlify/functions/send-sms \
  -H "Content-Type: application/json" \
  -H "x-send-secret: change_me" \
  -d '{"to": "+2557XXXXXXXX", "message": "Hello from Netlify + Africa'\''s Talking"}'
```

## Notes

- Netlify Functions are stateless — `inbound-sms.js` currently just logs incoming messages. Plug in a database (e.g. FaunaDB, Supabase, Airtable) if you need to persist/reply to them.
- Sandbox SMS only reaches numbers registered in your AT simulator. Go live (paid) to reach real subscribers broadly.
- Logs for incoming webhooks show up in Netlify's function logs (Site > Functions > Function name > Logs).
