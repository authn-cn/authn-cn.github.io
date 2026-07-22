---
title: "WeCom Scan-Login"
---

# WeCom Scan-Login (protocol deep-dive)

"Log in with WeCom" lets employees log into internal systems (OA, cloud desktop, admin consoles) by scanning a QR code with WeCom. It is essentially a **variant of the OAuth2 authorization-code flow**: a QR code is shown on a PC web page, the employee scans and confirms in the WeCom app, the browser receives a one-time `code`, and the **backend** exchanges that `code` for the employee's identity.

> The consumer-facing [WeChat scan-login](./wechat.md) needs only one step to fetch the user and uses different credentials — don't mix them up. To try it hands-on / see a clickable demo, see [Mock WeCom (usage)](../mock/wecom.md).

## The overall flow

```
Browser (your login page)           WeCom                          Your backend
   │  1. embed QR (JS SDK)              │                              │
   │ ───────────────────────────────►  │                              │
   │  2. employee scans + confirms      │                              │
   │  3. redirect_uri?code=&state=      │                              │
   │ ◄───────────────────────────────  │                              │
   │  4. hand the code to the backend ──────────────────────────────► │
   │                                    │  ① gettoken(corpid+secret)  │
   │                                    │  ② code→userid              │
   │                                    │  ③ userid→member detail      │
   │  5. establish your own session ◄───────────────────────────────  │
```

Steps 1–3 are "getting the `code` in the browser"; steps 4–5 are "the backend exchanges the `code` for an identity". **The JS SDK only handles the front-end part of steps 1–3**; the three backend steps have nothing to do with the SDK.

## What the JS SDK (wwLogin / @wecom/jssdk) actually does

The WeCom login JS SDK is a **very thin browser script**. Given `corpid` (appid), `agentid`, `redirect_uri`, `state`, etc., it does the following inside the `<div>` container you point it at:

1. **Builds the official authorize URL** from your params (`login_type=CorpApp`, …) so you don't have to memorize the format;
2. **Inserts an `<iframe>`** pointing at WeCom's official QR page (`open.work.weixin.qq.com/wwopen/sso/qrConnect`, or the newer `login.work.weixin.qq.com/wwlogin/sso/login`) — **the QR code itself is a page on WeCom's domain**, so rendering, scan-status polling and expiry refresh are all handled by the official page;
3. **Delivers the resulting `code` back to your page**: after the employee scans and confirms, the official page redirects to your `redirect_uri` with `code` + `state` (old `wwLogin` does a top-window redirect; the new `@wecom/jssdk` also supports an `onLoginSuccess` callback that hands you the `code` without a full-page navigation);
4. **Handles the details**: iframe size/style, `redirect_type` (redirect inside the iframe vs. top window), Chrome 142+'s `allow="local-network-access"`, etc.

In one line: **the SDK = "embed the official QR in your page + deliver the resulting `code` back"**. It never touches your `secret` and takes no part in the backend token exchange.

## Why use the JS SDK (instead of hand-rolling a link / iframe)

You *can* skip the SDK — redirect the whole page to WeCom's scan-login link and let it redirect back. But embedding the QR with the JS SDK has real benefits:

- **Users stay on your site**: a full-page redirect takes users to WeCom's domain and back; an embedded QR keeps them on your login page — better UX and conversion.
- **Avoids cross-origin pitfalls**: the QR page is on WeCom's domain, your page on yours. If you build the `<iframe>` yourself, you must handle scan-status polling, cross-origin retrieval of the `code`, and style adaptation — and the same-origin policy blocks much of it. The SDK polls via the official page and, on success, **the official page does the top-level redirect (or callback) to hand back the `code`** — you never touch cross-origin messaging.
- **Gets you the "desktop quick login" capability**: `@wecom/jssdk` automatically shows a **scan-free desktop quick-login panel** when conditions are met (see below) — you can't get this by hand-building a URL.
- **Protocol-aligned, officially maintained**: WeCom revisions (new hosts, `login_type`, panel logic, quick-login conditions) are tracked by the SDK; your code doesn't change.

> Conversely: if you do pure server-side rendering or just want a full-page redirect, you **can skip the SDK** and build the scan-login link directly. The SDK only wraps the "embed + UX + quick login" layer; **the backend flow after you get the `code` is identical.**

## Old vs. new SDK: `wwLogin.js` vs. `@wecom/jssdk`

| | Old `wwLogin.js` | New `@wecom/jssdk` (recommended) |
|---|---|---|
| Include | `<script>`, global `WwLogin` | `npm i @wecom/jssdk`, `import { createWWLoginPanel }` |
| Usage | `new WwLogin({ id, appid, agentid, redirect_uri, state })` | `ww.createWWLoginPanel({ el, params:{ login_type, appid, agentid, redirect_uri, state }, onLoginSuccess })` |
| Desktop quick login | ❌ | ✅ (desktop WeCom > 3.1.23, HTTPS, user in visible scope) |
| Getting the code | top-window redirect | redirect **or** `onLoginSuccess({ code })` callback |
| Maintenance | maintenance mode | actively evolving; new features land here |

The official guidance is to use `@wecom/jssdk` for new integrations; both end up on the same qrConnect and backend `/cgi-bin/*` APIs.

## After you get the `code`: why fetching user info takes three steps

This is the biggest difference from WeChat. The WeChat "Website App" fetches the user in one `/sns/userinfo` call; WeCom takes **three**:

1. **`gettoken`**: exchange `corpid` + app `secret` for an **app-level `access_token`**. It represents the **app** identity, not a user, and is used to call directory APIs. It has quotas/rate limits and **must be cached** server-side, refreshed per `expires_in`.
2. **`auth/getuserinfo`**: exchange `access_token` + the scanned `code` for **which employee** it is (`userid`, possibly a `user_ticket` too).
3. **`user/get`**: read that employee's **directory detail** (name, department, mobile, email, …) with `access_token` + `userid`.

Why this design? Because WeCom's `access_token` is a **corp/app-level credential** (it can read the whole directory), not "a token a user granted to you". So you first prove "I am this app" (gettoken), then use the one-time `code` to pin down "who scanned this time" (getuserinfo), then use the app's permission to read that person's record (user/get). The `code` is just a one-time credential linking "the scanner" to "the app".

(For sensitive fields like avatar/gender, use the `user_ticket` from step ② with `auth/getuserdetail`.)

## Key concepts & parameters

- **`corpid`**: the corp ID (it's the `appid` in the SDK).
- **`agentid`**: the self-built app ID; determines visible scope and permissions.
- **`secret`**: the app secret, used **only on the backend** for `gettoken`, never in the front end.
- **`userid`**: the member's unique id in the corp directory; the key for reading details and sending messages.
- **App-level `access_token`**: as above — always cache it.
- **Visible scope**: an employee outside the app's visible scope gets a no-permission error on scan.
- **`state`**: generated on start, compared on return — CSRF protection.
- **`errcode` / `errmsg`**: the uniform error shape of every WeCom API (`errcode:0` = success).

## Security essentials

- **Always exchange the `code` for tokens on the backend**; the `secret` must never appear in the front end or the repo.
- **Validate `state`** against CSRF / forged callbacks.
- **Enforce HTTPS** and configure the app's **trusted / callback domains** correctly (a mismatch yields a "link cannot be accessed" error).
- The `code` is short-lived and should be treated as **single-use**; the `access_token` has quotas — mind caching and refresh.

## Hands-on / integration

- 🔬 [Mock WeCom (usage)](../mock/wecom.md) — run the whole flow against Mock endpoints identical to the official ones, with a **clickable, real** scan demo embedded, plus the "going live = change only JS + URL" mapping.
- 📖 [OAuth 2.0 docs](../oauth2/) — the standard authorization-code flow · compare with [WeChat scan-login](./wechat.md)

## References

- [Web login component / building the scan-login link — WeCom Developer Center](https://developer.work.weixin.qq.com/document/path/98152)
- [Get access credential gettoken — WeCom Developer Center](https://developer.work.weixin.qq.com/document/path/91039)
- [Identity auth/getuserinfo · Read member user/get — WeCom Developer Center](https://developer.work.weixin.qq.com/document/path/91023)
