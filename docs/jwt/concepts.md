---
title: "核心概念"
---

# 核心概念

## 三段结构详解

一个 JWS 形态的 JWT 由三段 Base64URL 编码内容用 `.` 连接而成:`header.payload.signature`。

### Header

描述令牌本身的元信息,最关键的是签名算法:

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "2024-key-01"
}
```

| 字段 | 含义 |
|------|------|
| `alg` | 签名/加密算法。JWS 常见 `HS256`、`RS256`、`ES256`、`PS256`(取值见 [参考](./reference.md#alg-取值)) |
| `typ` | 令牌类型,通常 `JWT`;RFC 9068 的 access token 用 `at+jwt` |
| `kid` | Key ID,指明用哪把密钥验签,配合 [JWKS](../oidc/concepts.md#jwks、签名验证与-key-rotation) 定位公钥 |

### Payload(claims)

一组声明。分三类:

- **注册声明(Registered Claims)**:RFC 7519 预定义的标准字段,如 `iss`、`sub`、`aud`、`exp`、`nbf`、`iat`、`jti`。
- **公共声明(Public Claims)**:在 IANA 注册或使用抗冲突命名(如 OIDC 的 `email`、`name`)。
- **私有声明(Private Claims)**:签发方与消费方私下约定的自定义字段。

```json
{
  "iss": "https://op.example.com",
  "sub": "1234567890",
  "aud": "s6BhdRkqt3",
  "exp": 1767226800,
  "iat": 1767223200,
  "roles": ["admin", "editor"]
}
```

完整字段含义见 [参数与 Claims 参考](./reference.md)。

### Signature

对前两段(`base64url(header)` + `"."` + `base64url(payload)`)按 Header 里 `alg` 指定的算法签名。任何对 header/payload 的改动都会使签名失效。

## 签名算法:对称 vs 非对称

| 家族 | 代表 | 密钥 | 适用 |
|------|------|------|------|
| **HMAC** | `HS256` / `HS384` / `HS512` | **共享密钥**(签发方与验证方同一把) | 单一系统内部签发+校验;密钥必须严格保密 |
| **RSA** | `RS256` / `PS256` … | **私钥签名、公钥验签** | 跨方场景:OP 用私钥签,任意 RP 用公钥验(OIDC 默认 `RS256`) |
| **ECDSA** | `ES256` / `ES384` … | 私钥签名、公钥验签(椭圆曲线) | 同 RSA,签名更短、性能更好 |

::: tip 为什么 OIDC 默认用非对称
非对称算法下,OP 只需公开公钥(通过 [JWKS](../oidc/concepts.md#jwks、签名验证与-key-rotation)),任意 RP 都能验签而无需共享秘密。这正是"一个 OP 服务海量 RP"所需要的。可用 [JWK 生成器](../tools/jwk.md) 造测试密钥对。
:::

## 验签流程

拿到一个 JWT 后,消费方(如 RP 或资源服务器)应按顺序做:

1. **拆三段**,Base64URL 解码 Header,读出 `alg` 与 `kid`。
2. **确定密钥**:HMAC 用约定的共享密钥;非对称按 `kid` 到 JWKS 中取对应公钥。
3. **验证签名**:用 `alg` 指定算法校验第三段。
4. **校验声明**:`exp` 未过期、`nbf`/`iat` 合理(容忍少量时钟偏差,通常 ≤ 5 分钟);`iss`、`aud` 等于预期值。
5. 全部通过后,payload 才可信。

::: danger 三个致命验签坑
1. **接受 `alg: none`**:攻击者把算法改成 `none` 去掉签名。**必须维护 `alg` 白名单,绝不接受 `none`。**
2. **算法混淆(RS256 → HS256)**:攻击者把非对称算法改成 HMAC,并**拿公开的 RSA 公钥当作 HMAC 的共享密钥**去伪造签名。**验证方必须锁定预期算法族,不能盲从 token 里的 `alg`。**
3. **只解码不验签**:直接信任 payload。前两段人人可改,不验签等于没有安全性。

用成熟库(jose、openid-client、各语言官方 SDK),不要手写验签逻辑。可用本站 [JWT 解析器](../tools/jwt.md) 现场体会解码与验签的区别。
:::

## OIDC 三种 Token:谁是 JWT,谁不是

一次 OIDC 授权码流程最多会拿到三种 token,它们的规范约束**完全不同**——这是理解 JWT 归属的关键场景。

| Token | 是否 JWT | 谁来验证/消费 | 客户端(RP)能解析吗 |
|-------|---------|--------------|---------------------|
| **ID Token** | **必须是**(JWS 签名) | 客户端 (RP) | ✅ 必须解析并校验 |
| **Access Token** | **可选**(见 RFC 9068) | 资源服务器 | ❌ 视为不透明 |
| **Refresh Token** | **通常不是** | 授权服务器 | ❌ 绝不解析 |

### ID Token —— 必须是 JWT

OIDC 规范明确规定 ID Token 是签名过的 JWT,用途是"证明用户身份"。RP 必须验签并逐项校验 `iss`/`aud`/`exp`/`nonce`。详见 [OIDC 核心概念 · ID Token 校验清单](../oidc/concepts.md#rp-必须做的校验清单)。

### Access Token —— 规范不要求是 JWT

对 RP 来说 access token 应是**不透明(opaque)**的,RP 只管拿去调资源服务器,不该解析它。实际格式取决于授权服务器:

- **opaque(随机串)**:资源服务器通过 **Token Introspection**([RFC 7662](https://www.rfc-editor.org/rfc/rfc7662))端点在线校验。
- **JWT**:很多现代 AS(Entra ID、Keycloak、Auth0)按 [RFC 9068](https://www.rfc-editor.org/rfc/rfc9068) 把 access token 做成 JWT(`typ: at+jwt`),让资源服务器**本地验签**,免去每次网络请求。

::: warning 即使 access token 长得像 JWT,客户端也别依赖它的内容
JWT 化的 access token 是给**资源服务器**验签用的。授权服务器随时可能把它换回 opaque 格式,若你的客户端代码解析了它,就会崩。
:::

### Refresh Token —— 几乎从不是有意义的 JWT

对客户端完全不透明,唯一用途是拿去授权服务器换新的 access token。格式无规范要求,通常是高熵随机串(AS 库里存一条记录)或只有 AS 自己能解开的加密串。**客户端绝不能解析它。**

## Refresh Token 如何判断是否失效

因为 Refresh Token 对客户端不透明,**你无法解析出 `exp`,也就无法主动、可靠地预判它是否过期——只能在用它的时候才知道。**

### 方式一:用的时候看报错(最主流、最可靠)

拿 Refresh Token 去 token 端点换新 token,若已失效,授权服务器返回:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "invalid_grant",
  "error_description": "Token is expired or revoked"
}
```

**`invalid_grant`([RFC 6749 §5.2](https://www.rfc-editor.org/rfc/rfc6749#section-5.2))就是"这个 Refresh Token 不能用了"的标准信号**,它不区分是过期、被撤销还是被轮换作废——对客户端结果一样:**清本地会话,跳转重新登录**。标准逻辑是"乐观假设它有效,被打脸才处理":

```
access token 过期
  → 用 refresh token 换新的
     → 成功:保存新 token(注意轮换,见下),继续
     → invalid_grant:refresh token 也没了 → 重新登录
```

### 方式二:签发时记录 `expires_in`(只能估算,不可靠)

有些 AS 会返回**非标准**字段(各家不一)提示 Refresh Token 寿命:

```json
{
  "access_token": "...",
  "expires_in": 3600,
  "refresh_token": "...",
  "refresh_token_expires_in": 2592000
}
```

只能当参考:大多数 AS 不返回它;即便返回,Refresh Token 也可能因撤销、改密码、并发上限、轮换等**提前失效**。

### 重要的坑:Refresh Token Rotation(轮换)

现代 AS(尤其面向 SPA / 移动端)大多启用轮换:每次用 Refresh Token 换 token,**旧的立即作废,同时下发一个新的 Refresh Token**。后果:

1. 必须**每次持久化返回的新 Refresh Token**,否则下次就用了个已作废的。
2. 若一个用过的旧 Refresh Token 再次被使用(疑似泄露),AS 会**把整条 token 链全部作废**——此时即使"没过期"也会拿到 `invalid_grant`。

::: tip 工程结论
不要试图预判 Refresh Token 是否过期。**把 `invalid_grant` 当成唯一的真相来源**:收到即清会话、跳登录;启用轮换时务必每次保存新返回的 Refresh Token。
:::

## 相关阅读

- [参数与 Claims 参考](./reference.md) —— 注册声明、`alg` 取值、RFC 索引
- [OIDC 核心概念](../oidc/concepts.md) —— ID Token 校验清单、JWKS 与 key rotation
- [OAuth 2.0 文档](../oauth2/) —— access token、refresh token 在授权流程中的位置
