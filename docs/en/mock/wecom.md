---
title: "Mock WeCom (Scan-Login)"
---

# Mock WeCom Scan-Login (usage)

This site provides a **Mock WeCom** that is **identical in and out to the official one — only the domain is swapped for this site**: the same `WwLogin` SDK, the same `redirect_uri?code=&state=` callback, the same `/cgi-bin/*` endpoints and fields. It **does not validate the value of `corpid` / `secret` / `agentid`** and returns a fixed test member after scanning. Great for getting your integration working before you have a real corp/app.

> To first understand the protocol, what `WwLogin` / `@wecom/jssdk` do, and why user info takes three steps, see [WeCom Scan-Login (protocol deep-dive)](../cn-sso/wecom.md).

Base URL: **<https://mock.authn.tech/wecom/>** (every endpoint lives under `/wecom`).

## Endpoints

| Purpose | Mock endpoint | Official WeCom |
|---------|---------------|----------------|
| JS SDK | `/wecom/wwLogin.js` | `wwcdn.weixin.qq.com/.../wwLogin-*.js` |
| Embedded QR page | `/wecom/sso/qrConnect` | `open.work.weixin.qq.com/wwopen/sso/qrConnect` |
| ① get access_token | `/wecom/cgi-bin/gettoken` | `qyapi.weixin.qq.com/cgi-bin/gettoken` |
| ② code → userid | `/wecom/cgi-bin/auth/getuserinfo` | `qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo` |
| ③ member detail | `/wecom/cgi-bin/user/get` | `qyapi.weixin.qq.com/cgi-bin/user/get` |
| (optional) sensitive info | `/wecom/cgi-bin/auth/getuserdetail` | `qyapi.weixin.qq.com/cgi-bin/auth/getuserdetail` |
| Console | `/wecom/` | — |

## Quick start

**Front end** — embed the QR (just point the script at this site):

```html
<div id="ww_login"></div>
<script src="https://mock.authn.tech/wecom/wwLogin.js"></script>
<script>
  new WwLogin({
    id: "ww_login",
    appid: "any_corpid",     // Mock does not validate it
    agentid: "any_agentid",
    redirect_uri: encodeURIComponent("https://your-app.example/callback"),
    state: "random anti-forgery string"
  });
</script>
```

**Backend** — after the scan redirects back with a `code`, three steps:

```bash
curl "https://mock.authn.tech/wecom/cgi-bin/gettoken?corpid=demo&corpsecret=x"
# → { errcode:0, access_token, expires_in }
curl "https://mock.authn.tech/wecom/cgi-bin/auth/getuserinfo?access_token=<AT>&code=<CODE>"
# → { errcode:0, userid, user_ticket }
curl "https://mock.authn.tech/wecom/cgi-bin/user/get?access_token=<AT>&userid=<USERID>"
# → { errcode:0, userid:"zhangsan", name:"张三", department, mobile, email, ... }
```

## Live demo

To click through it for real (embed QR → scan → redirect → three-step exchange), use the standalone [Scan-Login Demo tool](../tools/wechat-login.html) (switch to the "WeCom" tab).

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
