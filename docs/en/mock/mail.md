---
title: Mail Server
---

# Mock Mail Server

A **ready-to-use online mailbox** that uses [Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/) to receive emails, write to D1, view online or via API, and automatically extract one-time verification codes. Typical use: develop and test **email one-time verification codes (email OTP / HOTP), magic links**—the tested system sends verification codes to some `@authn.tech` address, and tests immediately retrieve them via API.

**Online mailbox: <https://mock.authn.tech/mail/>** (requires specifying the recipient address)

## How to Use

1. Send verification code / link emails to any `@authn.tech` address, e.g., `otp@authn.tech` (recipient local part is arbitrary).
2. View online: Open [`/mail/?to=otp@authn.tech`](https://mock.authn.tech/mail/?to=otp@authn.tech), click subject to see details and rendered message body.
3. Or retrieve via API (suitable for CI / automation):

```bash
# Get the latest email to that address, with automatically extracted code
curl "https://mock.authn.tech/mail/api/latest?to=otp@authn.tech"
# → { "from": "...", "subject": "...", "code": "135790", "text": "...", ... }
```

When you don't need real incoming mail, inject a "fake" email for testing:

```bash
curl -X POST https://mock.authn.tech/mail/api/inject \
  -H 'Content-Type: application/json' \
  -d '{"to":"otp@authn.tech","subject":"Login verification code","text":"Your verification code is 135790"}'
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /mail/?to=<address>` | Online mailbox (**must** specify recipient address) |
| `GET /mail/view/<id>` | View single email online |
| `GET /mail/api/messages?to=<address>&limit=` | List JSON |
| `GET /mail/api/messages/<id>` | Single email JSON (with body) |
| `GET /mail/api/latest?to=<address>` | Latest email JSON, with extracted `code` |
| `POST /mail/api/inject` | Inject fake email (`to` required) |
| `POST /mail/api/clear?to=<address>` | Clear emails for an address |

::: warning Must Specify Recipient
For privacy, list / latest / clear **all require a specific recipient address** `to`; no "view all inbox" is provided. Senders only need to know their own recipient address and can view independently without interference.
:::

::: danger Testing Only
This is a public Mock mailbox: anyone who knows the recipient address can read emails sent to it. **Do not send real sensitive information**. Received emails are only retained for 24 hours and then automatically deleted.
:::

## How It Works

Emails sent to `@authn.tech` are delivered by Cloudflare Email Routing to the Worker's `email()` handler, which parses MIME using `postal-mime`, extracts subject and body, extracts verification codes, and writes to D1; viewing endpoints read from D1. Full chain: **send → Email Routing → Worker → parse & store → view online/via API**.
