---
title: "JWT 概述"
---

# JWT 概述

**JWT(JSON Web Token,RFC 7519)是一种通用的、与场景无关的令牌格式**:把一组声明(claims)打包成一个紧凑、可签名/可加密、可安全放进 URL 的字符串。它本身**不关心你拿它做什么**——认证、授权、服务间传递上下文都可以用。

## JWT 的"户口":它既不属于 OAuth 2.0,也不属于 OIDC

这是最常见的误解。JWT 是 IETF 定义的**独立标准**,属于一个更大的密码学规范家族 **JOSE(JSON Object Signing and Encryption)**:

| 规范 | 编号 | 作用 |
|------|------|------|
| **JWS** | RFC 7515 | JSON Web Signature —— 签名(防篡改) |
| **JWE** | RFC 7516 | JSON Web Encryption —— 加密(防泄露) |
| **JWK** | RFC 7517 | JSON Web Key —— 密钥的 JSON 表示 |
| **JWA** | RFC 7518 | JSON Web Algorithms —— 上述规范可用的算法(`RS256`、`ES256`、`A256GCM` 等) |
| **JWT** | RFC 7519 | JSON Web Token —— 用 JWS/JWE 承载 claims 的令牌 |

OAuth 2.0 与 OIDC 只是**借用**了 JWT 这个格式,并没有"拥有"它:

```
              JWT / JOSE   ← 独立的令牌与密码学格式标准(IETF)
                   ↑ 被用作实现手段
        ┌──────────┴──────────┐
    OAuth 2.0               OIDC
    (授权框架)         (在 OAuth2 之上加认证层)
    对 JWT:可选          对 ID Token:强制 JWT
```

- **OAuth 2.0(RFC 6749)**:**不规定** token 格式。access token 可以是随机串,也可以是 JWT(JWT 化有专门的 [RFC 9068](https://www.rfc-editor.org/rfc/rfc9068))。JWT 对 OAuth2 是可选的实现选择。
- **OIDC**:唯一"强制用 JWT"的地方——**ID Token 必须是 JWT**。这也是 OIDC 相对 OAuth2 引入的核心新东西之一。

::: tip 一句话记忆
**JWT 是被 OAuth2 / OIDC 借用的通用格式。OAuth2 对它"可选",OIDC(仅 ID Token)对它"必选"。** 你完全可以在与二者无关的场景(服务间签名数据、API 网关传上下文)里用 JWT。
:::

## JWS 与 JWE:签名 ≠ 加密

日常说的"JWT"绝大多数是 **JWS**(签名的),它有三段:

```
Header.Payload.Signature
```

- Header 与 Payload 只是 **Base64URL 编码**,**不是加密**——任何人都能解码看到内容。JWS 保证的是**完整性**(内容没被篡改),不是**机密性**。
- 因此:**不要把密码、密钥等敏感信息放进 JWS 的 payload**。需要机密性时才用 **JWE**(五段结构,内容被真正加密)。

绝大多数认证/授权场景(ID Token、access token)用的都是 JWS。本站文档若不特别说明,"JWT" 均指 JWS 形态。

## 三段结构一览

以一个 `RS256` 签名的 JWT 为例:

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjIwMjQtMDEifQ   ← Header
.eyJpc3MiOiJodHRwczovL29wLmV4YW1wbGUuY29tIiwic3ViIjoiMTIzNCJ9  ← Payload
.NHVaYe26MbtOYhSKkoKYdFVomg4i8ZJd8_-RU8VNbftc4TSMb4b...          ← Signature
```

| 段 | 内容 | 说明 |
|----|------|------|
| **Header** | `{"alg":"RS256","typ":"JWT","kid":"2024-01"}` | 签名算法 `alg`、类型 `typ`、密钥标识 `kid` |
| **Payload** | `{"iss":...,"sub":...,"exp":...}` | claims 集合(见 [参考速查](./reference.md)) |
| **Signature** | 对 `base64url(header) + "." + base64url(payload)` 的签名 | 用 Header 里 `alg` 指定的算法计算,防篡改 |

::: warning 解码 ≠ 验证
JWT 的前两段只是编码,谁都能解。只有**验签通过**、且 `iss`/`aud`/`exp` 等声明校验通过后,里面的内容才可信。详见 [核心概念 · 验签流程](./concepts.md#验签流程)。可用本站 [JWT 解析器](../tools/jwt.md) 现场解码与验签。
:::

## 本章导航

- [核心概念](./concepts.md) —— 三段结构详解、签名算法、验签流程与常见坑;OIDC 三种 Token(ID / Access / Refresh)分别是不是 JWT;Refresh Token 如何判断失效
- [参数与 Claims 参考](./reference.md) —— 注册声明速查、`alg` 取值表、Base64URL 说明、相关 RFC 索引

## 相关工具

- [JWT 解析器](../tools/jwt.md) —— 解码三段、时间校验、验签
- [JWT 签名生成](../tools/jwt-sign.md) —— 造测试 token
- [JWK 生成](../tools/jwk.md) / [Base64URL 编解码](../tools/base64url.md)
