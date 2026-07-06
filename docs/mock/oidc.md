---
title: OIDC Mock
---

# OIDC / OAuth2 Mock

OIDC / OAuth2 一侧包含三个角色:**OP**(签发方)、**RP**(客户端)、**RS**(受保护 API)。术语与整体说明见 [Mock 概览](./README.md)。

**服务地址:<https://mock.authn.tech/>**

## OP —— OpenID Provider(身份提供方 / 令牌签发方)

| 端点 | 路径 |
|------|------|
| Discovery | [`/.well-known/openid-configuration`](https://mock.authn.tech/.well-known/openid-configuration) |
| Authorization | `/oidc/authorize` |
| Token | `/oidc/token` |
| UserInfo | `/oidc/userinfo` |
| JWKS | [`/oidc/jwks.json`](https://mock.authn.tech/oidc/jwks.json) |

- **零注册**:任意 `client_id` / `redirect_uri` 均被接受,不校验 client secret。
- Authorization Code Flow + **PKCE**(S256 / plain);`refresh_token`(scope 含 `offline_access` 时)与 `client_credentials` grant。
- 两个固定测试用户 **alice** / **bob**;授权请求追加 `&user=alice` 可跳过用户选择页(CI 免交互)。
- CORS 全开,可直接从浏览器前端调用。

## RP —— Relying Party(依赖方 / 客户端)

**控制台:<https://mock.authn.tech/rp/>**

用本 Mock 作为**客户端**,连接**任意外部 OP**(Keycloak、Auth0、Okta、Azure AD,或本站 Mock OP),完整走一遍 Authorization Code + PKCE 登录:填入外部 OP 的 issuer 与 `client_id` → 自动拉取 Discovery → 发起登录 → 回调换令牌 → 用 OP 的 JWKS 验证 ID Token 签名 → 校验 `iss`/`aud`/`nonce`/`exp` → 调 UserInfo,逐步展示。

> 回调地址 `https://mock.authn.tech/rp/callback` 需加入外部 OP 的白名单。

## RS —— Resource Server(资源服务器 / 受保护 API)

**说明页:<https://mock.authn.tech/rs/>** · 受保护端点 `GET /rs/api`

校验 access token 的**签名、过期、`token_use` 与 `scope`**(需含 `profile`)后返回受保护资源;权限不足返回 `403 insufficient_scope`,无 / 失效令牌返回 `401 invalid_token`。

## 调用顺序(授权码 + PKCE)

以「你的 RP + Mock OP」为例:

1. **RP** 生成 `code_verifier`,算出 `code_challenge`(S256),连同 `state`、`nonce` 把浏览器重定向到 **OP** 的 `/oidc/authorize`。
2. **OP** 展示测试用户选择页(或凭 `&user=alice` 直接选定),带 `code` + `state` 回跳到 RP 的 `redirect_uri`。
3. **RP** 比对 `state`,用 `code` + `code_verifier` POST 到 **OP** 的 `/oidc/token`。
4. **OP** 校验 PKCE 后返回 `id_token` / `access_token`(及可选 `refresh_token`)。
5. **RP** 从 **OP** 的 `/oidc/jwks.json` 取公钥验签 `id_token`,并校验 `iss` / `aud` / `nonce` / `exp`。
6. **RP** 携 `access_token` 调 **OP** 的 `/oidc/userinfo`(或调 **RS** 的 `/rs/api`)获取用户信息 / 受保护资源。

想直接看效果?本站有一个**真实可点**的 [OIDC 登录演示](./demo.md),一键跑完上述流程并展示每步解析结果。

授权端点示例(替换成你的回调地址):

```
https://mock.authn.tech/oidc/authorize?client_id=demo&redirect_uri=https://your-app.example/callback&response_type=code&scope=openid+profile+email&state=xyz&nonce=n-abc
```

换取令牌:

```bash
curl -X POST https://mock.authn.tech/oidc/token \
  -d grant_type=authorization_code \
  -d code=<code> \
  -d redirect_uri=https://your-app.example/callback \
  -d client_id=demo
```

拿到的 `id_token` 可直接丢进 [JWT 解析器](../tools/jwt.md) 查看。
