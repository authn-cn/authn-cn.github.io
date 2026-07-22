---
title: "WeCom Scan-Login"
---

# WeCom Scan-Login (WeChat Work)

"Log in with WeCom" targets **employees within a company**: let them log into internal systems (OA, cloud desktop, admin consoles) with WeCom. It is also an **OAuth2 variant**, but the `access_token` is **app-level** and fetching user info takes **three steps** (gettoken → auth/getuserinfo → user/get).

> The consumer-facing [WeChat scan-login](./wechat.md) needs only one step (`/sns/userinfo`) and different credentials — don't mix them up.

## Prerequisites

1. Obtain the corp `corpid`; create a **self-built app** in the WeCom admin console to get its `agentid` + `secret`;
2. Configure the app's **trusted / login callback domain**, which must be **HTTPS**;
3. The logging-in employee must be within the app's **visible scope**.

## Flow

1. **Embed the QR code**: include `wwLogin.js` (or the newer `@wecom/jssdk`), `login_type=CorpApp`:

   ```html
   <div id="ww_login"></div>
   <script src="https://wwcdn.weixin.qq.com/node/wework/wwopen/js/wwLogin-1.2.7.js"></script>
   <script>
     new WwLogin({
       id: "ww_login",
       appid: "YOUR_corpid",
       agentid: "YOUR_agentid",
       redirect_uri: encodeURIComponent("https://your-app.example/callback"),
       state: "random anti-forgery string"
     });
   </script>
   ```

   The newer, recommended `@wecom/jssdk` uses `ww.createWWLoginPanel({ params: { login_type: "CorpApp", appid, agentid, redirect_uri, state } })`, which supports **both the QR code and desktop quick login** (a scan-free panel appears when desktop WeCom > 3.1.23, HTTPS, and the user is in the visible scope).

2. Scan and confirm → redirect back to `redirect_uri?code=CODE&state=STATE`;
3. **Backend step ①**: exchange `corpid` + app `secret` for an **app-level** `access_token` (rate-limited — **must be cached**):

   ```bash
   GET https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=CORPID&corpsecret=SECRET
   # → { errcode, errmsg, access_token, expires_in }
   ```

4. **Step ②**: exchange `access_token` + `code` for a `userid` (may also return `user_ticket`):

   ```bash
   GET https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=ACCESS_TOKEN&code=CODE
   # → { errcode, errmsg, userid, user_ticket }
   ```

5. **Step ③**: read the directory member detail with `access_token` + `userid`:

   ```bash
   GET https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=ACCESS_TOKEN&userid=USERID
   # → { errcode, errmsg, userid, name, department, mobile, email, ... }
   ```

   (Optional) fetch sensitive fields with `user_ticket` via `POST /cgi-bin/auth/getuserdetail`.

## Key concepts

- **`userid`**: the member's unique id in the **corp directory**; the key for reading details and sending messages.
- **App-level `access_token`**: not bound to a user, represents the "app identity", has quotas and rate limits — always **cache it server-side and refresh per `expires_in`**.
- **Visible scope**: a member outside the app's visible scope gets a no-permission error.
- **`errcode` / `errmsg`**: every WeCom API uses this error shape (`errcode:0` means success).

## Test against this site's Mock WeCom

This site provides a **Mock WeCom** with every endpoint under `https://mock.authn.tech/wecom/`, **identical in and out to the official one** — same `WwLogin` SDK, same callback, same `/cgi-bin/*` endpoints and fields, **does not validate the value of corpid / secret / agentid**, and returns a fixed test member after scanning.

| Purpose | Mock endpoint | Official WeCom |
|---------|---------------|----------------|
| JS SDK | `/wecom/wwLogin.js` | `wwcdn.weixin.qq.com/.../wwLogin-*.js` |
| Embedded QR page | `/wecom/sso/qrConnect` | `open.work.weixin.qq.com/wwopen/sso/qrConnect` |
| ① get access_token | `/wecom/cgi-bin/gettoken` | `qyapi.weixin.qq.com/cgi-bin/gettoken` |
| ② code → userid | `/wecom/cgi-bin/auth/getuserinfo` | `qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo` |
| ③ member detail | `/wecom/cgi-bin/user/get` | `qyapi.weixin.qq.com/cgi-bin/user/get` |
| Console | `/wecom/` | — |

## Live demo (clickable, real)

Run the flow below with the **identical SDK** of that Mock: click "Show login QR code", scan and confirm; the page returns with a `code` and walks through the WeCom three-step flow, showing each response.

<ClientOnly>
  <WechatLoginDemo lock-provider="wecom" />
</ClientOnly>

## Going live: change only the imported JS and the URL

The Mock's SDK is byte-for-byte identical to the official one (no `encodeURIComponent` on `redirect_uri`) and does not validate credential values. Your code stays the same; only two things change:

| Change | Mock | Real |
|--------|------|------|
| Imported JS | `https://mock.authn.tech/wecom/wwLogin.js` | Official `wwLogin` CDN or `@wecom/jssdk` |
| Backend API base | `https://mock.authn.tech/wecom` | `https://qyapi.weixin.qq.com` |

Backend paths (`/cgi-bin/gettoken`, `/cgi-bin/auth/getuserinfo`, `/cgi-bin/user/get`), `new WwLogin({...})` params and response fields all stay the same.

::: warning Test-only
The Mock returns a fixed member (`userid=zhangsan`), the authorization code is a short-lived, reusable self-signed JWT, and the signing key is public. **No production system should trust the Mock.**
:::

## Related reading

- [WeChat scan-login](./wechat.md) · [Mock Servers overview](../mock/)
- [OAuth 2.0 docs](../oauth2/) · [JWT Decoder](../tools/jwt.md)

## References

- [Web login component / building the scan-login link — WeCom Developer Center](https://developer.work.weixin.qq.com/document/path/98152)
- [Get access credential gettoken — WeCom Developer Center](https://developer.work.weixin.qq.com/document/path/91039)
- [Identity auth/getuserinfo · Read member user/get — WeCom Developer Center](https://developer.work.weixin.qq.com/document/path/91023)

<script setup>
import WechatLoginDemo from '@components/WechatLoginDemo.vue'
</script>
