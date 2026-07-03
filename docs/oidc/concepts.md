---
title: "核心概念"
---

# 核心概念

## 角色:OP、RP 与 End-User

OIDC 在 OAuth 2.0 的角色之上换了一套名字,映射关系如下:

| OIDC 角色 | 对应 OAuth 2.0 角色 | 说明 |
|-----------|--------------------|------|
| **OP**(OpenID Provider,身份提供方) | Authorization Server(授权服务器) | 负责认证用户、签发 ID Token / access token 的服务,如 Keycloak、Entra ID、Okta |
| **RP**(Relying Party,依赖方) | Client(客户端) | 依赖 OP 完成用户认证的应用,即"你的应用" |
| **End-User**(最终用户) | Resource Owner(资源属主) | 被认证的人 |

OP 同时也承担 OAuth 2.0 授权服务器的全部职责,因此一次 OIDC 流程可以同时产出 ID Token(给 RP 确认用户身份)与 access token(给 RP 调用 API,例如 UserInfo Endpoint)。

## ID Token 详解

ID Token 是 OIDC 的核心产物:一个**由 OP 签名的 JWT**,向 RP 断言"某用户在某时刻通过了认证"。它由三段 Base64URL 编码内容以 `.` 连接组成:`header.payload.signature`。

### 完整示例

Header(解码后):

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "2024-key-01"
}
```

Payload(解码后):

```json
{
  "iss": "https://op.example.com",
  "sub": "248289761001",
  "aud": "s6BhdRkqt3",
  "exp": 1767226800,
  "iat": 1767223200,
  "auth_time": 1767223180,
  "nonce": "n-0S6_WzA2Mj",
  "acr": "urn:mace:incommon:iap:silver",
  "amr": ["pwd", "otp"],
  "azp": "s6BhdRkqt3",
  "name": "张三",
  "email": "zhangsan@example.com",
  "email_verified": true
}
```

### 必需 claims

| Claim | 含义 |
|-------|------|
| `iss` | Issuer,签发者标识,是 OP 的 HTTPS URL,必须与 Discovery 文档中的 `issuer` 完全一致 |
| `sub` | Subject,用户在该 OP 下的唯一标识。**这是用户的主键,不要用 email 当主键** |
| `aud` | Audience,受众,必须包含 RP 的 `client_id`;可以是字符串或数组 |
| `exp` | Expiration,过期时间(Unix 秒),过期后必须拒绝 |
| `iat` | Issued At,签发时间(Unix 秒) |

### 常见可选 claims

| Claim | 含义 |
|-------|------|
| `nonce` | RP 在认证请求中传入的随机值,OP 原样放回,用于把 ID Token 绑定到本次会话、防重放。请求带了 nonce 则响应必含 |
| `auth_time` | 用户实际完成认证的时间。请求带 `max_age` 或 `auth_time` 为 essential claim 时必须返回 |
| `acr` | Authentication Context Class Reference,认证上下文等级(如是否满足某强度要求) |
| `amr` | Authentication Methods References,认证方法数组,如 `["pwd","otp"]`(密码+一次性口令) |
| `azp` | Authorized Party,被授权方;当 `aud` 含多个受众时标明 token 实际签发给哪个 client_id |

### RP 必须做的校验清单

拿到 ID Token 后,RP **必须**逐项校验(任何一项失败即拒绝登录):

1. **签名**:用 OP 的 JWKS 公钥按 header 中 `alg`/`kid` 验签;`alg` 必须在预期白名单内(**绝不接受 `none`**)。
2. **iss** 等于预期的 OP issuer(与 Discovery 文档的 `issuer` 一致)。
3. **aud** 包含自己的 `client_id`;若 `aud` 是多值数组,还须校验 `azp` 等于自己的 `client_id`。
4. **exp** 未过期、**iat** 合理(可容忍少量时钟偏差,通常 ≤ 5 分钟)。
5. **nonce** 与本次认证请求发出时存在会话里的值一致(用后即焚)。
6. 若请求了 `max_age`:校验 `auth_time + max_age` 未超限。
7. 若业务要求某认证强度:校验 `acr` 满足要求。

::: warning 不要跳过校验
市面上大量 OIDC 相关漏洞都源于 RP 偷懒:不验签、不验 `aud`、不验 `nonce`。使用成熟的认证库(如 openid-client、Spring Security、各语言官方 SDK),不要手写 JWT 解析逻辑。
:::

## 标准 scope 与对应 claims

OIDC 用 scope 批量申请一组用户属性(claims):

| Scope | 含义 | 对应 claims(节选) |
|-------|------|--------------------|
| `openid` | **必需**,声明这是 OIDC 认证请求 | `sub`(以及 ID Token 本身) |
| `profile` | 基本资料 | `name`、`given_name`、`family_name`、`nickname`、`preferred_username`、`picture`、`birthdate`、`locale`、`updated_at` 等 |
| `email` | 邮箱 | `email`、`email_verified` |
| `address` | 地址 | `address`(JSON 对象) |
| `phone` | 电话 | `phone_number`、`phone_number_verified` |
| `offline_access` | 申请 refresh token,以便用户离线后仍可换取新 token | —(不产生 claims) |

典型请求:`scope=openid profile email`。profile/email 等 scope 对应的 claims 由 OP 决定放进 ID Token 还是仅通过 UserInfo Endpoint 返回(多数 OP 默认放在 UserInfo)。

## UserInfo Endpoint

UserInfo Endpoint 是一个受 OAuth2 保护的 REST 接口,RP 用 access token 换取用户 claims:

```http
GET /userinfo HTTP/1.1
Host: op.example.com
Authorization: Bearer SlAV32hkKG
```

```json
{
  "sub": "248289761001",
  "name": "张三",
  "preferred_username": "zhangsan",
  "email": "zhangsan@example.com",
  "email_verified": true,
  "picture": "https://op.example.com/avatars/248289761001.jpg"
}
```

::: warning 比对 sub
RP 必须校验 UserInfo 响应中的 `sub` 与 ID Token 中的 `sub` 一致,不一致时丢弃 UserInfo 数据。这防止响应被混淆/替换。
:::

## Discovery:/.well-known/openid-configuration

OIDC Discovery 规定 OP 在固定路径发布元数据文档,RP 只需配置一个 issuer URL 即可自动发现所有端点与能力:

```http
GET /.well-known/openid-configuration HTTP/1.1
Host: op.example.com
```

响应节选:

```json
{
  "issuer": "https://op.example.com",
  "authorization_endpoint": "https://op.example.com/authorize",
  "token_endpoint": "https://op.example.com/token",
  "userinfo_endpoint": "https://op.example.com/userinfo",
  "jwks_uri": "https://op.example.com/.well-known/jwks.json",
  "end_session_endpoint": "https://op.example.com/logout",
  "scopes_supported": ["openid", "profile", "email", "offline_access"],
  "response_types_supported": ["code", "id_token", "code id_token"],
  "subject_types_supported": ["public", "pairwise"],
  "id_token_signing_alg_values_supported": ["RS256", "ES256"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "private_key_jwt"],
  "code_challenge_methods_supported": ["S256"]
}
```

RP 应校验文档中的 `issuer` 与请求的 issuer 完全一致(防止 issuer 混淆攻击),并可缓存该文档(遵循 HTTP 缓存头)。

## JWKS、签名验证与 key rotation

`jwks_uri` 指向 OP 的 **JWKS**(JSON Web Key Set,公钥集合):

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "2024-key-01",
      "alg": "RS256",
      "n": "0vx7agoebGcQSuuPiLJXZpt...(Base64URL 模数)",
      "e": "AQAB"
    }
  ]
}
```

验签流程:取 ID Token header 的 `kid`,在 JWKS 中找到对应公钥,按 `alg` 验证签名。

**Key rotation(密钥轮换)**:OP 会定期更换签名密钥。JWKS 中通常同时保留新旧多把 key;RP 应缓存 JWKS,当遇到未知 `kid` 时重新拉取一次(并做频率限制,防止被恶意 token 打爆 OP)。成熟客户端库都内置了这套逻辑。

## sub 的稳定性:public 与 pairwise

`sub` 在"同一 OP + 同一用户"范围内稳定且永不复用,是 RP 侧关联本地账号的唯一正确键。OP 有两种 subject 类型:

| 类型 | 行为 | 适用 |
|------|------|------|
| `public` | 所有 RP 看到同一个 `sub` | 常见默认;多应用间需要按用户对账时必须用它 |
| `pairwise` | 每个 RP(按 sector)看到不同的 `sub` | 隐私增强:防止多个 RP 串通用 `sub` 拼接用户画像 |

::: danger 不要用 email 做用户主键
email 可以被用户更换,某些 OP 甚至允许 email 回收再分配(前员工邮箱给新员工)。**本地账号必须以 `iss + sub` 组合为主键**,email 只作为展示/联系方式。
:::

## 会话与登出

OIDC 中存在两层会话:**OP 会话**(用户在 OP 登录后的 SSO 会话,通常是 OP 域下的 Cookie)与 **RP 会话**(你的应用自己的登录态)。登出的复杂性来自两层会话需要协同清理:

- **RP-Initiated Logout**:用户在 RP 点"退出",RP 清掉本地会话后,把浏览器重定向到 OP 的 `end_session_endpoint`(携带 `id_token_hint` 与 `post_logout_redirect_uri`),让 OP 也结束会话。这是最常用、必做的一种,详见[典型流程](./flows.md)。
- **Front-Channel Logout**:OP 端会话结束时,OP 在登出页面里为每个已登录 RP 渲染一个隐藏 iframe,加载各 RP 的 `frontchannel_logout_uri`,RP 收到请求后清理自己的会话。实现简单,但受浏览器第三方 Cookie 限制影响,**可靠性差**。
- **Back-Channel Logout**:OP 直接以服务器间 HTTP POST 向各 RP 的 `backchannel_logout_uri` 发送一个签名的 **Logout Token**(一种特殊 JWT,含 `sub`/`sid`,且带 `events` claim、明确不含 `nonce`),RP 验签后销毁对应会话。不依赖浏览器,**可靠性最高**,但要求 RP 会话可按 `sid`(session ID)索引,对无状态 JWT 会话架构不友好。

选择建议:所有项目实现 RP-Initiated Logout;有严格单点登出需求(如金融、企业合规)再上 Back-Channel Logout。

---

下一步:阅读[典型流程](./flows.md)看这些概念如何在一次完整登录中串起来,或查阅[参数与 Claims 参考](./reference.md)。
