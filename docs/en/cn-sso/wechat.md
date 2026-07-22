---
title: "WeChat Scan-Login"
---

# WeChat Scan-Login (protocol deep-dive)

"Log in with WeChat" targets **consumers**: let visitors log into your website with their personal WeChat. It is essentially the **OAuth2 authorization-code flow** with `scope=snsapi_login`: a QR code is shown on a PC web page, the user scans and authorizes in WeChat, the browser gets a one-time `code`, and the **backend** exchanges it for user info.

> The employee-facing [WeCom scan-login](./wecom.md) fetches the user in three steps and uses different credentials — don't mix them up. To try it hands-on / see a clickable demo, see [Mock WeChat (usage)](../mock/wechat.md).

## The overall flow

```
Browser (your login page)           WeChat                         Your backend
   │  1. embed QR (wxLogin.js)          │                             │
   │ ──────────────────────────────►   │                             │
   │  2. scan + authorize on phone      │                             │
   │  3. redirect_uri?code=&state=      │                             │
   │ ◄──────────────────────────────   │                             │
   │  4. hand the code to the backend ─────────────────────────────► │
   │                                    │  /sns/oauth2/access_token   │
   │                                    │  (→ access_token + openid)  │
   │                                    │  /sns/userinfo (profile)    │
   │  5. establish your own session ◄──────────────────────────────  │
```

The `code` is obtained in the browser; the token exchange and profile fetch both happen on the **backend** (they need the `AppSecret`).

## What the JS SDK (wxLogin.js) actually does

`wxLogin.js` is a thin browser script. Given `appid`, `scope`, `redirect_uri`, `state`, etc., inside the `<div>` container you point it at, it:

1. **Builds the official authorize URL** and **inserts an `<iframe>`** pointing at WeChat's official QR page (`open.weixin.qq.com/connect/qrconnect`) — the QR is a page on WeChat's domain, so rendering, scan status and expiry refresh are handled by the official page;
2. **Delivers the `code` back to your page**: after the user scans and confirms, the official page redirects to your `redirect_uri` with `code` + `state`;
3. **`self_redirect` controls where it lands**: `false` = top-window redirect (full page goes to `redirect_uri`), `true` = redirect inside the iframe;
4. **Handles details** like iframe size/style and Chrome 142+'s `allow="local-network-access"`.

In one line: **the SDK = "embed the official QR in your page + deliver the resulting `code` back"**. It never touches the `AppSecret` and takes no part in the backend token exchange.

## Why use the JS SDK (instead of hand-rolling a link)

You *can* skip the SDK — redirect the whole page to `https://open.weixin.qq.com/connect/qrconnect?...#wechat_redirect` and let it redirect back. But embedding the QR with the SDK:

- **Keeps users on your site**: they stay on your login page instead of being taken to WeChat's domain and back — better UX and conversion;
- **Avoids cross-origin work**: the QR page is on WeChat's domain, your page on yours. A hand-built iframe must handle scan-status polling, cross-origin retrieval of the `code`, and styling; the SDK does this via the official page, which then top-redirects to hand back the `code` — you never touch cross-origin messaging;
- **Officially maintained, protocol-aligned**: WeChat revisions (quick login, style params, Chrome compatibility) are tracked by the SDK.

> If you specifically want a full-page redirect / server-side rendering, you **can skip the SDK**; the backend flow after you get the `code` is identical.

## After you get the `code`

The WeChat "Website App" fetches the user in two steps (one fewer than WeCom):

1. **`/sns/oauth2/access_token`**: exchange `AppID` + `AppSecret` + `code` for `access_token` + `openid` (+ `unionid`, `refresh_token`). Here the `access_token` is **bound to the user** (unlike WeCom's app-level token).
2. **`/sns/userinfo`**: fetch nickname, avatar, etc. with `access_token` + `openid`.

## Key concepts

- **`openid`**: the user's unique id **within this app**; the same person has a different `openid` in another app.
- **`unionid`**: links the same user **across apps / official accounts** under one Open Platform account. Key on `unionid` for a unified website + mini-program + official-account identity.
- **`scope=snsapi_login`**: fixed for website-app scan-login.
- **Authorized callback domain**: configured in the Open Platform console (domain only); a mismatch with `redirect_uri`'s domain errors out.
- **`state`**: CSRF protection.
- **Quick login**: recent desktop WeChat (Windows 3.9.11+ / Mac 4.0+) offers scan-free confirmation when already logged in; users can still switch to the QR.

> Note: WeChat "Website App" scan-login does **not use PKCE** (PKCE is standard OAuth2, not part of this WeChat path); security relies on "the `code` is only exchanged on the backend with the `AppSecret`".

## Security essentials

- **Always exchange the `code` for tokens on the backend**; the `AppSecret` never in the front end or the repo;
- **Validate `state`** against CSRF;
- **Enforce HTTPS**, configure the authorized callback domain correctly;
- The `code` is short-lived and single-use; the `access_token` expires — mind refresh.

## Hands-on / integration

- 🔬 [Scan-Login Demo](../tools/wechat-login.html) — a **clickable, real** run of the flow with the Mock's identical SDK (switch to the "WeChat" tab)
- 🧪 [Mock WeChat (usage)](../mock/wechat.md) — endpoints, integration code and the "going live = change only JS + URL" mapping
- 📖 [OAuth 2.0 docs](../oauth2/) · compare with [WeCom scan-login](./wecom.md)

## References

- [Website App WeChat Login guide — WeChat Open Docs](https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html)
- [Website App authorized login (incl. embedded QR wxLogin.js) — WeChat Open Docs](https://developers.weixin.qq.com/doc/oplatform/developers/dev/auth/web)
