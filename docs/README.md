---
home: true
title: 首页
heroText: Authn.tech
tagline: 身份认证与授权的中文工具站 —— 在线工具 · Mock 服务器 · 协议文档
actions:
  - text: 打开在线工具
    link: /tools/
    type: primary
  - text: Mock 服务器演示
    link: /mock/
    type: secondary
features:
  - title: 🛠 在线工具
    details: 13 个纯浏览器端工具，数据不出本地：JWT 解析与签名、PKCE 生成、OIDC Discovery 查看、SAML 报文编解码与 Metadata 解析、JWK↔PEM 转换、TOTP、WebAuthn 演示等。
  - title: 🚀 Mock 服务器
    details: 已上线的 SAML / OIDC 双协议 Mock，四角色齐全（IdP / SP / OP / RP）外加资源服务器，真实签名验签，用于联调、集成测试与学习演练。
  - title: 📖 协议文档
    details: 系统化的 SAML 2.0、OAuth 2.0、OIDC、WebAuthn/Passkey、MFA/TOTP 中文介绍：核心概念、典型流程、关键参数，面向工程实践。
footer: Authn.tech · 用中文把认证与授权讲清楚
---

## 在线工具

纯浏览器端运行，数据不出本地，随开随用：

- **JWT** — [解析器](/tools/jwt.html)（jwt.io 风格，三段高亮 + 签名验证）、[签名生成](/tools/jwt-sign.html)
- **OAuth 2.0 / OIDC** — [PKCE 生成器](/tools/pkce.html)、[OIDC Discovery 查看器](/tools/discovery.html)、[JWK 查看](/tools/jwk.html)、[JWK → PEM 转换](/tools/jwk-convert.html)
- **SAML** — [报文编解码](/tools/saml.html)、[Response 解析](/tools/saml-parse.html)、[Metadata 解析](/tools/saml-metadata.html)
- **MFA / Passkey** — [TOTP 动态码](/tools/totp.html)、[WebAuthn 演示](/tools/webauthn.html)
- **通用** — [Base64URL 编解码](/tools/base64url.html)、[证书查看](/tools/cert.html)

## Mock 服务器

已上线的 SAML / OIDC 双协议 Mock，四角色齐全，真实签名验签，可直接联调：

- **OIDC OP** — `/.well-known` + 授权/令牌/JWKS 端点
- **OIDC RP** — 连任意外部 OP，JWKS 验签
- **资源服务器** — 校验 bearer token 的 scope
- **SAML IdP / SP** — enveloped 签名，ACS 验签展示

👉 [查看 Mock 演示与端点说明](/mock/)

## 协议文档

- 想搞懂**企业单点登录**（SSO）？从 [SAML 2.0 概述](/saml/) 开始。
- 想给 API 做**授权**？看 [OAuth 2.0 概述](/oauth2/)。
- 想实现"**用 XX 账号登录**"？看 [OIDC 概述](/oidc/)。
- 想做**无密码 / 抗钓鱼登录**（Passkey）？看 [WebAuthn 概述](/webauthn/)。
- 想加**第二因素**（动态验证码）？看 [MFA / TOTP 概述](/mfa/)。
