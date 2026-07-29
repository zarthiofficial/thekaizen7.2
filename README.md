# Kaizen 7.2 • Bhopal Chapter — Registration Landing Page

Plain HTML/CSS/JS site (no build step) — a custom-branded registration page
that writes straight into a Google Sheet through a Google Apps Script Web App.
Nothing but the public form endpoint touches the browser: no Sheet ID, no
Google credentials, no API keys in the frontend.

```
kaizen-site/
├── index.html                 ← the page
├── styles.css
├── script.js                  ← UTM capture, validation, submit logic
├── config.js                  ← ONLY file you edit to go live
├── assets/                    ← your logo files
└── google-apps-script/
    └── Code.gs                ← paste this into Apps Script
```

## 1. Create the Google Sheet

1. Create a new spreadsheet — e.g. **Kaizen 2026 Registrations**.
2. Rename the first tab (or add one) to exactly: **Registrations**
3. Leave Row 1 empty — the script writes the header row itself the first
   time it runs. If you'd rather set it yourself, use exactly:

   `Timestamp | Full Name | Employee Code | Hive | Official Email | Alcohol Preference | Train Booking Assistance | Stay Booking Assistance | Travel Preference | Event Suggestions | ZPL Ticket Consent | UTM Source | UTM Medium | UTM Campaign | UTM Content | Landing Page | Referrer`

The sheet can stay **private** — it does not need to be shared publicly for
registrations to reach it.

## 2. Add the Apps Script (bound to the Sheet)

1. From the spreadsheet: **Extensions → Apps Script**.
2. Delete the sample `Code.gs` content and paste in
   [`google-apps-script/Code.gs`](google-apps-script/Code.gs) from this folder.
3. Save the project (e.g. name it "Kaizen Registration Backend").

Because the script is created from the Sheet itself, it's automatically
*bound* to it — the code never needs a Sheet ID or URL.

## 3. Deploy as a Web App

1. In the Apps Script editor: **Deploy → New deployment**.
2. Click the gear icon next to "Select type" → choose **Web app**.
3. Settings:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**, then **authorize access** when prompted (this is your
   own script asking to write to your own sheet — approve it).
5. Copy the **Web app URL** (it ends in `/exec`).

Test it directly: paste the URL into a browser tab. You should see
`{"status":"ok","message":"Kaizen registration endpoint is live."}`.

> **Re-deploying later:** if you edit `Code.gs` after this, use
> **Deploy → Manage deployments → Edit (pencil) → New version → Deploy**.
> Editing the code alone does not update a live deployment.

## 4. Point the frontend at your endpoint

Open `config.js` and paste your URL:

```js
submissionEndpoint: "https://script.google.com/macros/s/XXXXXXXXXXXX/exec",
```

That's the only edit required to go live. Update dates, venue, etc. in the
same file whenever they change.

## 5. Publish on GitHub Pages

1. Create a new GitHub repository (e.g. `kaizen-7-2-bhopal`).
2. Upload everything in this folder to the repo root (keep the folder
   structure — `google-apps-script/` can stay in the repo for reference;
   it never gets executed client-side, only Google runs it).
3. In the repo: **Settings → Pages**.
4. Under **Source**, choose **Deploy from a branch** → branch `main`,
   folder `/ (root)` → **Save**.
5. GitHub gives you a URL like `https://yourusername.github.io/kaizen-7-2-bhopal/`
   within a minute or two.

No build tools, no `npm install` — GitHub Pages serves the HTML/CSS/JS as-is.

## 6. Test end-to-end before sharing widely

1. Open the GitHub Pages URL and submit a real test registration.
2. Confirm a new row lands in the **Registrations** tab with a timestamp.
3. Submit the same email again — it should be rejected as a duplicate
   without creating a second row.
4. Try a UTM-tagged link, e.g.
   `https://yourusername.github.io/kaizen-7-2-bhopal/?utm_source=email&utm_medium=teams&utm_campaign=kaizen72`
   and confirm those four columns populate in the sheet.
5. Visit the page with no UTM parameters at all — the columns should read
   `direct` rather than being blank or erroring.

## Notes on the cross-origin setup

GitHub Pages (your domain) and the Apps Script Web App (`script.google.com`)
are different origins. The frontend deliberately sends the request with a
`text/plain` content type instead of `application/json` — this keeps it a
browser "simple request" and avoids a CORS preflight (`OPTIONS`) call, which
Apps Script Web Apps don't handle. `Code.gs` parses the body as JSON
regardless of the header, so this only affects the request, not the data.

## Duplicate-submission protection

- **Client side:** the Register button disables itself and shows "Submitting…"
  the instant it's clicked, so a repeated click can't fire a second request.
- **Server side:** `Code.gs` uses `LockService` to serialize concurrent
  requests, then checks the **Official Email** column before appending a row.
  A second submission with the same email returns a friendly "already
  registered" response instead of a duplicate row.

## What's already handled

- UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`)
  are captured on arrival and stored in `sessionStorage`, so they survive
  even if the visitor browses before submitting. Missing values are stored
  as `"direct"` rather than causing errors.
- Landing page URL and referrer are captured the same way.
- Server-side required-field validation (name, employee code, Hive, work
  email, ticket consent) runs independently of the frontend checks.
- Failed submissions keep the entered data — nothing is cleared until the
  backend confirms success.
- Success state replaces the form with the confirmation message; no page
  reload.
