---
title: "参数与 Claims 参考"
---

# 参数与 Claims 参考

## 注册声明(Registered Claims,RFC 7519 §4.1)

这些是 RFC 7519 预留的标准 payload 字段,全部**可选**,但被 OAuth2 / OIDC 等上层规范按需设为必需。

| Claim | 全称 | 含义 |
|-------|------|------|
| `iss` | Issuer | 签发者标识,通常是 AS/OP 的 HTTPS URL |
| `sub` | Subject | 主体(令牌所描述的实体),在 `iss` 范围内唯一 |
| `aud` | Audience | 受众,令牌的预期接收方;可为字符串或数组 |
| `exp` | Expiration Time | 过期时间(Unix 秒),之后必须拒绝 |
| `nbf` | Not Before | 生效时间(Unix 秒),之前必须拒绝 |
| `iat` | Issued At | 签发时间(Unix 秒) |
| `jti` | JWT ID | 令牌唯一标识,可用于防重放/黑名单 |

::: tip 时间类 claim 都是 Unix 秒
`exp` / `nbf` / `iat` 均为自 1970-01-01 UTC 起的**秒数**(非毫秒)。校验时允许少量时钟偏差(clock skew),通常 ≤ 300 秒。
:::

## Header 常见字段

| 字段 | 含义 |
|------|------|
| `alg` | 签名/加密算法(见下表) |
| `typ` | 令牌类型:`JWT`;RFC 9068 access token 用 `at+jwt`;登出令牌用 `logout+jwt` |
| `kid` | Key ID,配合 JWKS 定位验签公钥 |
| `cty` | 内容类型,嵌套 JWT 时用 |
| `jku` / `x5c` / `x5t` | 指向密钥的 URL / 证书链 / 证书指纹(接受外部 `jku` 有风险,需谨慎) |

## `alg` 取值

### JWS 签名算法(RFC 7518 §3)

| `alg` | 说明 | 密钥类型 |
|-------|------|----------|
| `HS256` / `HS384` / `HS512` | HMAC + SHA-2 | 对称共享密钥 |
| `RS256` / `RS384` / `RS512` | RSASSA-PKCS1-v1_5 + SHA-2 | RSA 公私钥 |
| `PS256` / `PS384` / `PS512` | RSASSA-PSS + SHA-2 | RSA 公私钥 |
| `ES256` / `ES384` / `ES512` | ECDSA + SHA-2 | EC 公私钥 |
| `EdDSA` | Ed25519 / Ed448(RFC 8037) | OKP 公私钥 |
| `none` | 无签名 | —— |

::: danger 绝不接受 `none`
生产环境**必须**维护 `alg` 白名单并拒绝 `none`,同时锁定预期算法族以防 RS256→HS256 混淆攻击。详见 [核心概念 · 三个致命验签坑](./concepts.md#验签流程)。
:::

### 常见 JWE 加密算法(RFC 7518,当需要机密性)

| 用途 | 取值示例 |
|------|----------|
| 密钥管理(`alg`) | `RSA-OAEP`、`ECDH-ES`、`A256KW` |
| 内容加密(`enc`) | `A128GCM`、`A256GCM`、`A256CBC-HS512` |

## Base64URL

JWT 各段用 **Base64URL**(RFC 4648 §5)编码,与标准 Base64 的区别:

- `+` → `-`,`/` → `_`
- 去掉末尾 `=` 填充

目的是让令牌能安全地放进 URL 和 HTTP 头。可用 [Base64URL 编解码工具](../tools/base64url.md) 互转。

## 相关 RFC 索引

| RFC | 标题 |
|-----|------|
| [RFC 7515](https://www.rfc-editor.org/rfc/rfc7515) | JSON Web Signature (JWS) |
| [RFC 7516](https://www.rfc-editor.org/rfc/rfc7516) | JSON Web Encryption (JWE) |
| [RFC 7517](https://www.rfc-editor.org/rfc/rfc7517) | JSON Web Key (JWK) |
| [RFC 7518](https://www.rfc-editor.org/rfc/rfc7518) | JSON Web Algorithms (JWA) |
| [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519) | JSON Web Token (JWT) |
| [RFC 7662](https://www.rfc-editor.org/rfc/rfc7662) | OAuth 2.0 Token Introspection |
| [RFC 8037](https://www.rfc-editor.org/rfc/rfc8037) | CFRG 曲线的 JOSE 用法(EdDSA 等) |
| [RFC 9068](https://www.rfc-editor.org/rfc/rfc9068) | JWT Profile for OAuth 2.0 Access Tokens |

## 相关工具

- [JWT 解析器](../tools/jwt.md) —— 解码与验签
- [JWT 签名生成](../tools/jwt-sign.md) —— 造测试 token
- [JWK 生成](../tools/jwk.md) · [JWK → PEM](../tools/jwk-convert.md) · [PEM → JWK](../tools/pem-to-jwk.md)
- [Base64URL 编解码](../tools/base64url.md)
