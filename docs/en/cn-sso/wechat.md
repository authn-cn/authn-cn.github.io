---
title: "WeChat Scan-Login"
---

# WeChat Scan-Login (WeChat Open Platform · Website App)

"Log in with WeChat" targets **consumers**: let visitors log into your website with their personal WeChat. It is a **variant of the OAuth2 authorization-code flow** with `scope=snsapi_login` — a QR code is embedded on the PC web page, the user scans it with WeChat, and the backend then exchanges the returned `code` for user info.

> The employee-facing [WeCom scan-login](./wecom.md) uses a different credential model and a different set of steps — don't mix them up.

## Prerequisites

1. Register on the **WeChat Open Platform**, create and get approval for a **Website App**, obtain `AppID` / `AppSecret`;
2. Configure the **authorized callback domain** (domain only — no scheme or path);
3. Your site must be **HTTPS**.

## Flow

1. **Embed the QR code**: include the official `wxLogin.js` and call `new WxLogin({...})`:

   ```html
   <div id="login_container"></div>
   <script src="https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js"></script>
   <script>
     new WxLogin({
       id: "login_container",
       appid: "YOUR_AppID",
       scope: "snsapi_login",
       redirect_uri: encodeURIComponent("https://your-app.example/callback"), // official convention: caller url-encodes
       state: "random anti-forgery string",
       self_redirect: false   // false = top-window redirect, true = redirect inside the iframe
     });
   </script>
   ```

   (Equivalently, redirect straight to `https://open.weixin.qq.com/connect/qrconnect?appid=...&scope=snsapi_login&redirect_uri=...&state=...#wechat_redirect`.)

2. The user scans and confirms authorization in WeChat;
3. WeChat **redirects back** to `redirect_uri?code=CODE&state=STATE`;
4. The **backend** exchanges the `code` (always on the backend — `AppSecret` never in the front end):

   ```bash
   GET https://api.weixin.qq.com/sns/oauth2/access_token?appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code
   # → { access_token, expires_in, refresh_token, openid, scope, unionid }
   ```

5. Fetch the profile with `access_token` + `openid`:

   ```bash
   GET https://api.weixin.qq.com/sns/userinfo?access_token=ACCESS_TOKEN&openid=OPENID&lang=zh_CN
   # → { openid, nickname, sex, province, city, country, headimgurl, privilege, unionid }
   ```

## Key concepts

- **`openid`**: the user's unique id **within this app**; the same person has a different `openid` in another app.
- **`unionid`**: links the same user **across multiple apps / official accounts** under one Open Platform account. For a unified account across website + mini-program + official account, key on `unionid`.
- **`state`**: generated on start, compared on return — CSRF protection.
- **Chrome 142+**: the embedded auth frame triggers a "local network access" prompt; the official `wxLogin.js` adds `allow="local-network-access"` to the iframe automatically — add it manually if you build the iframe yourself.
- **Quick login**: recent desktop WeChat (Windows 3.9.11+ / Mac 4.0+) offers a scan-free confirmation when already logged in; the user can still switch to the QR code.

## Test against this site's Mock WeChat

You can run the whole flow before you have an approved Website App: this site provides a **Mock WeChat** (`https://mock.authn.tech/wechat/`) that is **byte-for-byte identical to the official one, only the domain differs** — same `WxLogin` SDK, same callback, same `/sns/*` endpoints and fields, **does not validate AppID / AppSecret**, and returns a fixed test user after scanning.

| Purpose | Mock endpoint | Official WeChat |
|---------|---------------|-----------------|
| JS SDK | `/wechat/wxLogin.js` | `res.wx.qq.com/.../wxLogin.js` |
| Embedded QR page | `/connect/qrconnect` | `open.weixin.qq.com/connect/qrconnect` |
| code → token | `/sns/oauth2/access_token` | `api.weixin.qq.com/sns/oauth2/access_token` |
| User info | `/sns/userinfo` | `api.weixin.qq.com/sns/userinfo` |
| Console | `/wechat/` | — |

## Live demo (clickable, real)

Run the flow below with the **identical SDK** of that Mock: click "Show login QR code", scan it or use the "(dev) simulate scan → confirm" link under the QR; the page returns with a `code` and automatically exchanges it for user info.

<ClientOnly>
  <WechatLoginDemo lock-provider="wechat" />
</ClientOnly>

## Going live: change only the imported JS and the URL

The Mock's SDK is byte-for-byte identical to the official one (it does not `encodeURIComponent` the `redirect_uri` — the caller url-encodes it, per the official convention) and does not validate credential values. Your code stays the same; only two things change:

| Change | Mock | Real |
|--------|------|------|
| Imported JS | `https://mock.authn.tech/wechat/wxLogin.js` | `https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js` |
| Backend API base | `https://mock.authn.tech` | `https://api.weixin.qq.com` |

Backend paths, `new WxLogin({...})` params, the `redirect_uri?code=&state=` callback and the response fields all stay the same.

::: warning Test-only
The Mock returns a fixed user, the authorization code is a short-lived, reusable self-signed JWT, and the signing key is public. **No production system should trust the Mock.**
:::

## Related reading

- [WeCom scan-login](./wecom.md) · [Mock Servers overview](../mock/)
- [OAuth 2.0 docs](../oauth2/) — WeChat login is a variant of it · [JWT Decoder](../tools/jwt.md)

## References

- [Website App WeChat Login guide — WeChat Open Docs](https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html)
- [Website App authorized login (incl. embedded QR wxLogin.js) — WeChat Open Docs](https://developers.weixin.qq.com/doc/oplatform/developers/dev/auth/web)

<script setup>
import WechatLoginDemo from '@components/WechatLoginDemo.vue'
</script>
