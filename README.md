# USSD Console — Africa's Talking + Netlify

Lets anyone reach you from an ordinary phone — no internet, no app, no smartphone.
They dial a USSD code, type a message on their keypad, it's forwarded to you as a
real SMS, and it lands in this web app's dashboard. You reply, and it goes out as
a real SMS too.

## Architecture

```
  Phone                Africa's Talking          This app (Netlify)
┌─────────┐               API cloud              ┌──────────────┐
│  *483#  │  1. dials    ┌──────────┐  2. POST    │  /ussd       │
│         │ ───────────► │  routes  │ ──────────► │  (function)  │
│         │  4. menu     │ request  │  3. text    │              │
│         │ ◄─────────── │          │ ◄────────── │  returns     │
└─────────┘               └──────────┘             │  CON / END   │
                                                    └──────┬───────┘
                                                           │ saves to
                                                           ▼
                                                    ┌──────────────┐
                                                    │ Netlify Blobs│
                                                    └──────┬───────┘
                                                           │ read by
                                                           ▼
                                              ┌──────────────────────┐
                                              │  Dashboard (browser) │
                                              │  view + reply by SMS │
                                              └──────────────────────┘
```

## Folder structure

```
africastalking-ussd-app/
├── netlify.toml                     # tells Netlify where functions + site files live
├── package.json                     # dependencies
├── .env.example                     # copy to .env — your API keys go here
│
├── public/                          # ─── "Your Web Application" in the diagram
│   └── index.html                   # the dashboard — view messages, send replies
│
└── netlify/functions/                # ─── the API layer between AT and your data
    ├── ussd.js                      # ★ main endpoint — AT calls this on every menu step,
    │                                 #   forwards the finished message to ADMIN_PHONE_NUMBER as SMS
    ├── inbound-sms.js               # catches SMS sent directly to your AT number
    ├── messages.js                  # dashboard calls this to read the message log
    └── send-sms.js                  # dashboard calls this to send an SMS reply
```

## The two callback URLs

Africa's Talking needs **two** separate callbacks configured, since USSD and SMS are different products in their dashboard:

| Setting | URL | Where in AT dashboard |
|---|---|---|
| USSD Callback URL | `https://<your-site>.netlify.app/.netlify/functions/ussd` | USSD → your service code |
| SMS Callback URL | `https://<your-site>.netlify.app/.netlify/functions/inbound-sms` | SMS → Callback URLs |

You don't have to set the SMS one if you only care about USSD-originated messages — it's there so any SMS sent straight to your AT number also shows up in the same dashboard.

## APIs you'll need

| What | Where to get it | Used for |
|---|---|---|
| **Africa's Talking account** | https://account.africastalking.com/ | Sandbox app is free for testing |
| **Username + API Key** | AT dashboard → Settings → API Key | Authenticates all requests (`AT_USERNAME`, `AT_API_KEY`) |
| **USSD service/short code** | AT dashboard → USSD | The code people dial (sandbox gives you a test code immediately; a real one reachable by the public requires applying for a shared or dedicated code) |
| **SMS product (for replies)** | Included with your AT account | Sends your reply as a real SMS back to the phone that dialed in |
| **Netlify account** | https://app.netlify.com | Hosts the functions + dashboard, and the Blobs store (no separate database needed) |

No other third-party API is required — storage runs on Netlify Blobs, which is provisioned automatically when you deploy.

## If you see a Netlify Blobs error

If `/messages` returns something like *"The environment has not been configured to use Netlify Blobs"*, it means your deploy method didn't auto-inject the Blobs context. Fix it by adding two more environment variables in Netlify:

| Variable | Where to find it |
|---|---|
| `NETLIFY_SITE_ID` | Site settings → General → Site details → **Site ID** |
| `NETLIFY_API_TOKEN` | User settings (click your avatar) → Applications → **New access token** |

Add both, then trigger a new deploy (Deploys → Trigger deploy → Deploy site). The functions will use these automatically as a fallback — no code changes needed.

## Setup

**1. Environment variables** — copy `.env.example` to `.env`, then set the same values in Netlify's dashboard under *Site settings → Environment variables*:

```
AT_USERNAME=sandbox
AT_API_KEY=your_api_key_here
AT_SENDER_ID=              # optional
ADMIN_PHONE_NUMBER=        # receives an SMS every time someone submits via USSD
SEND_SMS_SECRET=           # optional — protects the reply endpoint
DASHBOARD_SECRET=          # optional — protects the messages endpoint
```

**2. Install & run locally**

```bash
npm install
npm install -g netlify-cli
netlify dev
```

**3. Deploy**

```bash
netlify deploy --prod
```
or connect the repo through the Netlify dashboard (build command `npm install`, publish directory `public`, functions directory `netlify/functions` — already set in `netlify.toml`).

**4. Point Africa's Talking at your app**

AT dashboard → **USSD** → your service code → Callback URL:
```
https://<your-site>.netlify.app/.netlify/functions/ussd
```

**5. Test**

Dial your sandbox code in AT's Simulator, type a message, then open `https://<your-site>.netlify.app/` — it appears in the console. Type a reply and it sends as SMS.

## Editing the menu

All menu logic lives in `netlify/functions/ussd.js`. Africa's Talking sends the whole conversation so far in one `text` field (e.g. `"1*Hello"`), so the function reads that string to decide what screen to show next. The comments in the file walk through exactly how that works — extend the `if/else` chain there to add more options or steps.

## Notes

- USSD sessions are short-lived and stateless — the entire back-and-forth is reconstructed from the `text` field on each request, by design of the protocol.
- A sandbox USSD code only works through AT's Simulator. Going live for real phones requires applying for a shared or dedicated code with Africa's Talking, which involves their own review process.
