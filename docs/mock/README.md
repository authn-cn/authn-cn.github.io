---
title: Mock 服务器
---

# Mock 认证服务器

**服务地址:<https://mock.authn.tech/>**

这是一套**开箱即用的在线 Mock 认证服务**,部署在 Cloudflare Workers 上。认证/授权流程通常需要多个角色协作(签发令牌的一方、消费令牌的一方、受保护的 API……),自己把它们全搭起来很费事。本 Mock 把这些角色都实现好并放在公网,你可以:

- **联调**:开发客户端时,不必先搭一套 Keycloak / ADFS,直接对接本站的 Mock;反过来,只有服务端也能用本站的 Mock 客户端来打你的服务。
- **集成测试**:CI 中以固定、可预期的响应验证你的认证集成代码(追加 `&user=alice` 可免交互)。
- **学习演练**:配合[协议文档](../oidc/),实际观察每一步报文长什么样。

## 角色与术语

认证流程里的每一方都有固定称呼。下表是本 Mock 覆盖的角色:

| 缩写 | 全称 | 中文 | 在流程里做什么 |
|------|------|------|----------------|
| **OP** | OpenID Provider | OIDC 身份提供方 / 令牌签发方 | 验证用户身份、签发 `id_token` / `access_token` |
| **RP** | Relying Party | 依赖方 / 客户端应用 | 把用户重定向到 OP 登录、消费并校验令牌 |
| **RS** | Resource Server | 资源服务器 / 受保护 API | 校验 `access_token` 后返回受保护数据 |
| **IdP** | Identity Provider | SAML 身份提供方 | 验证用户身份、签发签名的 SAML 断言 |
| **SP** | Service Provider | SAML 服务提供方 / 受信应用 | 发起登录、接收并验签 IdP 的断言 |

> OIDC / OAuth2 一侧对应 **OP · RP · RS**;SAML 一侧对应 **IdP · SP**。二者角色是互相对应的:OP≈IdP(签发方)、RP≈SP(消费方)。

::: danger 仅供测试
签名私钥公开在[源码](https://github.com/authn-cn/authn-mock)中,任何人都能伪造该服务签发的令牌 / 断言;授权码也不保证单次使用(无状态实现)。**任何生产系统都不应信任 Mock 服务签发的断言或令牌。**
:::

---

## OIDC / OAuth2 三角色

### OP —— OpenID Provider(身份提供方 / 令牌签发方)

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

### RP —— Relying Party(依赖方 / 客户端)

**控制台:<https://mock.authn.tech/rp/>**

用本 Mock 作为**客户端**,连接**任意外部 OP**(Keycloak、Auth0、Okta、Azure AD,或本站 Mock OP),完整走一遍 Authorization Code + PKCE 登录:填入外部 OP 的 issuer 与 `client_id` → 自动拉取 Discovery → 发起登录 → 回调换令牌 → 用 OP 的 JWKS 验证 ID Token 签名 → 校验 `iss`/`aud`/`nonce`/`exp` → 调 UserInfo,逐步展示。

> 回调地址 `https://mock.authn.tech/rp/callback` 需加入外部 OP 的白名单。

### RS —— Resource Server(资源服务器 / 受保护 API)

**说明页:<https://mock.authn.tech/rs/>** · 受保护端点 `GET /rs/api`

校验 access token 的**签名、过期、`token_use` 与 `scope`**(需含 `profile`)后返回受保护资源;权限不足返回 `403 insufficient_scope`,无 / 失效令牌返回 `401 invalid_token`。

### OIDC 调用顺序(授权码 + PKCE)

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

---

## SAML 两角色

### IdP —— Identity Provider(身份提供方)

| 端点 | 路径 |
|------|------|
| Metadata | [`/saml/idp/metadata`](https://mock.authn.tech/saml/idp/metadata) |
| SSO(Redirect / POST) | `/saml/idp/sso` |

- 把 Metadata URL 导入你的 SP 即可对接。**SP-initiated**:向 SSO 端点发 `AuthnRequest`(支持 Redirect 与 POST Binding)。
- **IdP-initiated**:`/saml/idp/sso?user=alice&sp=<SP-entityID>&acs=<SP-ACS-URL>`。
- 签发含 `AttributeStatement`(email / name 等)的签名断言,已通过业界标准库 `xml-crypto` 独立验签,自签名证书内置于 Metadata。

### SP —— Service Provider(服务提供方)

| 端点 | 路径 |
|------|------|
| 控制台 | [`/saml/sp/`](https://mock.authn.tech/saml/sp/) |
| Metadata | [`/saml/sp/metadata`](https://mock.authn.tech/saml/sp/metadata) |
| ACS(POST) | `/saml/sp/acs` |

打开控制台点一下即可发起 SP-initiated 登录,并**展示验签结果与断言解析**。

### SAML 调用顺序(SP-initiated Web Browser SSO)

以「你的 SP + Mock IdP」为例:

1. **SP** 生成 `AuthnRequest`,把浏览器重定向(或 POST)到 **IdP** 的 `/saml/idp/sso`。
2. **IdP** 展示测试用户选择页(或凭 `&user=alice` 直接选定)。
3. **IdP** 生成并**签名** SAML `Response`(内含 `Assertion`),通过浏览器 POST 回到 **SP** 的 ACS(`AssertionConsumerService`)地址。
4. **SP** 用 IdP Metadata 里的证书**验签**,校验 `Audience`、`NotBefore` / `NotOnOrAfter`、`InResponseTo` 等条件。
5. **SP** 从 `Assertion` 读取 `NameID` 与属性,建立本地会话。

> `AuthnRequest` / `Response` 原文可用 [SAML 编解码](../tools/saml.md) 与 [SAML Response 解析](../tools/saml-parse.md) 查看;Metadata 用 [SAML Metadata 解析](../tools/saml-metadata.md)。

---

## 混搭:用你自己的服务替换其中一环

Mock 的价值在于**只 mock 你还没有的那部分**,其余用你自己的真实服务。常见组合:

| 你已经有 | 用 Mock 补上 | 怎么接 |
|----------|--------------|--------|
| RP / 客户端 | **Mock OP** | 把你 RP 的 issuer 指向 `https://mock.authn.tech`(自动发现 `/.well-known/openid-configuration`) |
| OP / 授权服务器 | **Mock RP** | 打开 [`/rp/`](https://mock.authn.tech/rp/) 控制台,填你的 issuer 与 `client_id`,并把 `…/rp/callback` 加入白名单 |
| 受保护 API 但缺令牌来源 | **Mock OP** | 从 Mock OP 用 `client_credentials` 或授权码取 `access_token`,再拿去调你的 API |
| API 客户端但缺受保护资源 | **Mock RS** | 用 Mock OP 签发的令牌调 [`/rs/api`](https://mock.authn.tech/rs/),验证你客户端的 401 / 403 处理 |
| SP / 受信应用 | **Mock IdP** | 把 [`/saml/idp/metadata`](https://mock.authn.tech/saml/idp/metadata) 导入你的 SP |
| IdP | **Mock SP** | 把你 IdP 的 Metadata 配到 Mock SP,或用 IdP-initiated 发到 Mock SP 的 ACS |

思路统一:**签发方(OP / IdP)与消费方(RP / SP)总是成对出现**,你补齐缺的那一方,让 Mock 与你的真实服务对接,就能端到端跑完整个流程。

实现进展与需求欢迎到 [GitHub](https://github.com/authn-cn/authn-mock) 参与讨论。
