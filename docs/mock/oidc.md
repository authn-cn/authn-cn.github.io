---
title: OIDC Mock
---

# OIDC / OAuth2 Mock

OAuth 2.0(RFC 6749)一侧有三个可对接的服务角色:**Authorization Server**(OIDC 里叫 OpenID Provider / OP)、**Client**(OIDC 里叫 Relying Party / RP)、**Resource Server**。术语对照与整体说明见 [Mock 概览](./README.md)。

**服务地址:<https://mock.authn.tech/>**

## Authorization Server(OIDC:OpenID Provider / OP)

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

## Client(OIDC:Relying Party / RP)

**控制台:<https://mock.authn.tech/rp/>**

用本 Mock 作为**客户端**,连接**任意外部 OP**(Keycloak、Auth0、Okta、Azure AD,或本站 Mock OP),完整走一遍 Authorization Code + PKCE 登录:填入外部 OP 的 issuer 与 `client_id` → 自动拉取 Discovery → 发起登录 → 回调换令牌 → 用 OP 的 JWKS 验证 ID Token 签名 → 校验 `iss`/`aud`/`nonce`/`exp` → 调 UserInfo,逐步展示。

> 回调地址 `https://mock.authn.tech/rp/callback` 需加入外部 OP 的白名单。

### 手动分步模式（OP 在内网 / WAF 之后）

**控制台:<https://mock.authn.tech/rp/manual>**

上面的自动模式要求 **本站能直接访问你的 OP**。若 OP 位于企业内网、VPN 或 WAF / 登录门户之后,运行在公网的本站根本连不上它,Discovery、令牌交换、JWKS 三处请求会全部失败。

典型症状:安全网关带着 **HTTP 200** 返回一张 HTML 拦截页(而不是 401/403),于是 JSON 解析失败,页面报 502。自动模式现在会把 HTTP 状态、`content-type` 与正文片段一并显示出来,便于确认是被谁拦下的。

手动模式把网络这一半交还给你 —— **本站不会向你的 OP 发出任何请求**,只负责构造 URL 与离线解析、验签:

| 步骤 | 你做的事 | 本站做的事 |
|------|----------|------------|
| ① | 在能访问 OP 的浏览器里打开 `.well-known/openid-configuration`,把 JSON 粘贴进来（也可手工填端点) | 解析端点、校验完整性 |
| ② | 点「发起登录」 | 生成 `state`/`nonce`/PKCE,构造授权 URL 并 **302** 跳转（跳转由你的浏览器发出) |
| ③ | 复制页面给出的 curl,在能访问 OP 的机器上执行,把令牌响应粘回来 | 校验 `state`,把 `code`、`code_verifier` 等参数填进 curl 命令 |
| ④ | —— | 离线解码 ID Token,校验 `iss`/`aud`/`nonce`/`exp` |
| ⑤ | 打开 `jwks_uri`,把 JWKS 粘回来 | 用 WebCrypto 本地验签,输出最终结论 |

其它要点:

- 若该 client 的 redirect_uri 白名单只允许内网地址,登录后你会落在自己的应用上 —— 把地址栏里的完整 URL 复制到 [手动粘贴回调 URL](https://mock.authn.tech/rp/manual/callback) 即可继续。
- client 未启用 PKCE 时,步骤 ① 可取消勾选;需要 `prompt`、`acr_values` 等额外授权参数时,在同一页按 `key=value` 逐行填写。
- 登录上下文是一个签名 JWT,存在 HttpOnly cookie 里(有效期 1 小时),页面上也给出可复制的副本,cookie 丢了不会卡住。

## Resource Server(资源服务器 / 受保护 API)

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
