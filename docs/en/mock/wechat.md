---
title: "Mock WeChat (Scan-Login)"
---

# Mock WeChat Scan-Login (usage)

This site provides a **Mock WeChat Open Platform "Website App" scan-login** that is **identical in and out to the official one — only the domain is swapped for this site**: the same `WxLogin` SDK, the same callback, the same `/sns/*` endpoints and fields. It **does not validate `AppID` / `AppSecret`** and returns a fixed test user after scanning. Great for getting your integration working before you have an approved Website App.

> To first understand the protocol, what `wxLogin.js` does, and why you'd use a JS SDK, see [WeChat Scan-Login (protocol deep-dive)](../cn-sso/wechat.md).

Base URL: **<https://mock.authn.tech/wechat/>**.

## Endpoints

| Purpose | Mock endpoint | Official WeChat |
|---------|---------------|-----------------|
| JS SDK | `/wechat/wxLogin.js` | `res.wx.qq.com/.../wxLogin.js` |
| Embedded QR page | `/connect/qrconnect` | `open.weixin.qq.com/connect/qrconnect` |
| code → token | `/sns/oauth2/access_token` | `api.weixin.qq.com/sns/oauth2/access_token` |
| refresh token | `/sns/oauth2/refresh_token` | `api.weixin.qq.com/sns/oauth2/refresh_token` |
| user info | `/sns/userinfo` | `api.weixin.qq.com/sns/userinfo` |
| validate token | `/sns/auth` | `api.weixin.qq.com/sns/auth` |
| Console | `/wechat/` | — |

## Quick start

**Front end** — embed the QR (just point the script at this site):

```html
<div id="login_container"></div>
<script src="https://mock.authn.tech/wechat/wxLogin.js"></script>
<script>
  new WxLogin({
    id: "login_container",
    appid: "any_AppID",     // Mock does not validate it
    scope: "snsapi_login",
    redirect_uri: encodeURIComponent("https://your-app.example/callback"),
    state: "random anti-forgery string"
  });
</script>
```

**Backend** — after the scan redirects back with a `code`:

```bash
curl "https://mock.authn.tech/sns/oauth2/access_token?appid=demo&secret=x&code=<CODE>&grant_type=authorization_code"
# → { access_token, expires_in, refresh_token, openid, scope, unionid }
curl "https://mock.authn.tech/sns/userinfo?access_token=<AT>&openid=<OPENID>"
# → { openid, nickname:"微信测试用户", sex, province, city, country, headimgurl, privilege, unionid }
```

## Live demo

To click through it for real (embed QR → scan → redirect → exchange for user info), use the standalone [Scan-Login Demo tool](../tools/wechat-login.html) (switch to the "WeChat" tab).

## Going live: change only the imported JS and the URL

The Mock's SDK is byte-for-byte identical to the official one (no `encodeURIComponent` on `redirect_uri` — the caller url-encodes it, per the official convention) and does not validate credential values. Your code stays the same; only two things change:

| Change | Mock | Real |
|--------|------|------|
| Imported JS | `https://mock.authn.tech/wechat/wxLogin.js` | `https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js` |
| Backend API base | `https://mock.authn.tech` | `https://api.weixin.qq.com` |

Backend paths, `new WxLogin({...})` params, the `redirect_uri?code=&state=` callback and response fields all stay the same.

::: warning Test-only
The Mock returns a fixed user, the authorization code is a short-lived, reusable self-signed JWT, and the signing key is public. **No production system should trust the Mock.**
:::
