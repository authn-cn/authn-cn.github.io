---
title: Mock 服务器
---

# Mock 服务器

本板块提供**开箱即用的在线 Mock 认证服务**,部署在 Cloudflare Workers 上,用于:

- **联调**:你在开发 RP / SP 时,不必先搭一套 Keycloak / ADFS,直接对接本站的 Mock OP / IdP
- **集成测试**:CI 中以固定、可预期的响应验证你的认证集成代码
- **学习演练**:配合[协议文档](../oidc/),实际观察每一步报文长什么样

## ✅ Mock OIDC OP(已上线)

**服务地址:<https://authn-mock.lich-wang8718.workers.dev/>**

| 端点 | 路径 |
|------|------|
| Discovery | [`/.well-known/openid-configuration`](https://authn-mock.lich-wang8718.workers.dev/.well-known/openid-configuration) |
| Authorization | `/oidc/authorize` |
| Token | `/oidc/token` |
| UserInfo | `/oidc/userinfo` |
| JWKS | [`/oidc/jwks.json`](https://authn-mock.lich-wang8718.workers.dev/oidc/jwks.json) |

### 特性

- **零注册**:任意 `client_id` / `redirect_uri` 均被接受,不校验 client secret
- Authorization Code Flow + **PKCE**(S256 / plain)
- `refresh_token`(scope 含 `offline_access` 时签发)与 `client_credentials` grant
- 两个固定测试用户 **alice** / **bob**;授权请求追加 `&user=alice` 可跳过用户选择页(CI 免交互)
- CORS 全开,可直接从浏览器前端调用

### 快速开始

浏览器打开(替换成你的回调地址):

```
https://authn-mock.lich-wang8718.workers.dev/oidc/authorize?client_id=demo&redirect_uri=https://your-app.example/callback&response_type=code&scope=openid+profile+email&state=xyz&nonce=n-abc
```

选择测试用户后携带 `code` 回跳,然后换取令牌:

```bash
curl -X POST https://authn-mock.lich-wang8718.workers.dev/oidc/token \
  -d grant_type=authorization_code \
  -d code=<code> \
  -d redirect_uri=https://your-app.example/callback \
  -d client_id=demo
```

拿到的 `id_token` 可以直接丢进本站的 [JWT 解析器](../tools/jwt.md) 查看。

::: tip 想直接看效果?
本站提供了一个**真实可点的** [OIDC 登录演示](./demo.md) —— 一键跑完整个授权码登录流程并展示解析结果,无需自己写代码。
:::

::: danger 仅供测试
签名私钥公开在[源码](https://github.com/authn-cn)中,任何人都能伪造该服务签发的令牌;授权码也不保证单次使用(无状态实现)。任何生产系统都不应信任 Mock 服务签发的断言或令牌。
:::

## ✅ Mock SAML IdP(已上线)

一个 SAML 2.0 身份提供方,签名的 Response/Assertion 已通过业界标准库 `xml-crypto` 独立验签,外部严格 SP 也能接受。

| 端点 | 路径 |
|------|------|
| Metadata | [`/saml/idp/metadata`](https://authn-mock.lich-wang8718.workers.dev/saml/idp/metadata) |
| SSO(Redirect / POST) | `/saml/idp/sso` |

- 把 Metadata URL 导入你的 SP 即可对接;**SP-initiated** 直接向 SSO 端点发 `AuthnRequest`(支持 Redirect 与 POST Binding)
- **IdP-initiated**:`/saml/idp/sso?user=alice&sp=<SP-entityID>&acs=<SP-ACS-URL>`
- 签发含 `AttributeStatement`(email/name 等)的签名断言,自签名证书内置于 Metadata

## ✅ Mock SAML SP(已上线)

一个 SAML 2.0 服务提供方,与上面的 IdP 配对可端到端演示 Web Browser SSO。

| 端点 | 路径 |
|------|------|
| 控制台 | [`/saml/sp/`](https://authn-mock.lich-wang8718.workers.dev/saml/sp/) |
| Metadata | [`/saml/sp/metadata`](https://authn-mock.lich-wang8718.workers.dev/saml/sp/metadata) |
| ACS(POST) | `/saml/sp/acs` |

打开控制台点一下即可发起 SP-initiated 登录:本 SP 生成 `AuthnRequest` → 跳到 IdP → 选测试用户 → IdP 签名 Response 经 POST 回到 ACS → **展示验签结果与断言解析**。

## ✅ Mock OIDC RP(已上线)

用本 mock 作为**客户端**,连接**任意外部 OP / IdP**(Keycloak、Auth0、Okta、Azure AD,或本站 Mock OP),完整走一遍 Authorization Code + PKCE 登录。

**控制台:<https://authn-mock.lich-wang8718.workers.dev/rp/>**

- 填入外部 OP 的 issuer/discovery URL 与 `client_id`(公共客户端可只用 PKCE)
- 自动拉取 Discovery → 发起登录 → 回调换取令牌 → **用 OP 的 JWKS 验证 ID Token 签名** → 校验 `iss`/`aud`/`nonce`/`exp` → 调 UserInfo,逐步展示
- 记得在外部 OP 把回调地址 `https://authn-mock.lich-wang8718.workers.dev/rp/callback` 加入白名单

## ✅ Mock 资源服务器(已上线)

OAuth2 里 RP 之外的另一角色:一个受 Bearer access token 保护的 API。

**说明页:<https://authn-mock.lich-wang8718.workers.dev/rs/>** · 受保护端点 `GET /rs/api`

- 校验 access token 的**签名、过期、`token_use` 与 `scope`**(需含 `profile`)后返回受保护资源
- 令牌不足权限返回 `403 insufficient_scope`,无/失效令牌返回 `401 invalid_token`

---

四个 mock 角色现已齐全(OIDC OP/RP + 资源服务器、SAML IdP/SP)。实现进展欢迎到 [GitHub](https://github.com/authn-cn/authn-mock) 参与讨论。
