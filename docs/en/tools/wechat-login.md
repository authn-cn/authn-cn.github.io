---
title: WeChat / WeCom Scan-Login Demo
---

# WeChat / WeCom Scan-Login Demo

A fully in-browser, **clickable, real** scan-login demo. It embeds a QR code with a Mock SDK that is **byte-for-byte identical** to the official one (`WxLogin` / `WwLogin`), runs the full authorization-code flow, and finally exchanges and displays the user info on this page. Use the tabs below to pick "WeChat (Website App)" or "WeCom".

<ClientOnly>
  <WechatLoginDemo />
</ClientOnly>

## How to use it

1. Pick a platform → click "Show login QR code";
2. Scan with your phone, or click the "(dev) simulate scan → confirm" link under the QR;
3. The page returns with a `code`, validates `state`, then calls the Mock backend:
   - **WeChat**: `/sns/oauth2/access_token` → `/sns/userinfo`;
   - **WeCom**: `/cgi-bin/gettoken` → `/cgi-bin/auth/getuserinfo` → `/cgi-bin/user/get`.

The whole exchange runs locally in your browser (the Mock has CORS enabled). It targets this site's [Mock service](../mock/) by default; the input at the top lets you point it at your own deployment.

## Go deeper

- 📖 Protocol: [WeChat scan-login](../cn-sso/wechat.md) · [WeCom scan-login](../cn-sso/wecom.md) — what the JS SDK does, why you'd use it, why WeCom takes three steps
- 🧪 Mock usage: [Mock WeChat](../mock/wechat.md) · [Mock WeCom](../mock/wecom.md) — endpoints, integration code and "going live = change only JS + URL"

::: warning Test-only
The Mock returns a fixed user/member, the authorization code is a short-lived, reusable self-signed JWT, and the signing key is public. Never use it in production.
:::

<script setup>
import WechatLoginDemo from '@components/WechatLoginDemo.vue'
</script>
