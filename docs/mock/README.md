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

::: danger 仅供测试
签名私钥公开在[源码](https://github.com/authn-cn)中,任何人都能伪造该服务签发的令牌;授权码也不保证单次使用(无状态实现)。任何生产系统都不应信任 Mock 服务签发的断言或令牌。
:::

## 规划中

| 服务 | 角色 | 主要能力 | 状态 |
|------|------|----------|------|
| Mock SAML IdP | 身份提供方 | Metadata、SSO 端点、签名 Response;支持 SP-initiated 与 IdP-initiated | 🚧 规划中 |
| Mock SAML SP | 服务提供方 | Metadata、ACS 端点;展示收到的 Response / Assertion 解析结果 | 🚧 规划中 |
| Mock OIDC RP | Relying Party | 向任意 OP 发起登录,逐步展示授权码、token 响应与 ID Token 校验过程 | 🚧 规划中 |

实现进展会在本页更新,欢迎到 [GitHub](https://github.com/authn-cn/authn-cn.github.io/issues) 参与讨论。
