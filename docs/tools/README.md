---
title: 工具总览
---

# 在线工具

本站提供一组面向认证协议调试的在线小工具。**全部逻辑在浏览器本地运行,你的 token / 报文不会被上传到任何服务器**,可放心粘贴调试数据。

## JWT / JWK

| 工具 | 用途 |
|------|------|
| [JWT 解析与验签](./jwt.md) | jwt.io 风格双栏解码,三段彩色高亮;支持 `HS/RS/PS/ES` 全系列签名验证 |
| [JWT 签名生成](./jwt-sign.md) | 填 Payload + 密钥生成签名 token,可一键生成测试密钥对 |
| [JWK / 密钥生成](./jwk.md) | 生成 RSA/EC 密钥对,导出 JWK、JWKS、PEM,含 RFC 7638 `kid` |
| [JWK / JWKS → PEM](./jwk-convert.md) | 把 JWK/JWKS 转成 PEM 公钥,展示 `kty`/`alg`/`use`/`kid` 与 thumbprint |
| [PEM → JWK](./pem-to-jwk.md) | 把 PEM 公钥(SPKI)/ 私钥(PKCS#8)转成 JWK,附 RFC 7638 `kid` |

## OAuth2 / OIDC

| 工具 | 用途 |
|------|------|
| [PKCE 生成器](./pkce.md) | 生成 `code_verifier` / `code_challenge`(S256) 及 `state`、`nonce` |
| [OIDC Discovery 查看器](./discovery.md) | 输入 issuer,拉取并解读 `/.well-known/openid-configuration` 与 JWKS |

## MFA / Passkey

| 工具 | 用途 |
|------|------|
| [TOTP 工具](./totp.md) | 生成密钥、实时验证码与倒计时、`otpauth://` URI 与二维码,校验验证码 |
| [WebAuthn 演示](./webauthn.md) | 浏览器内真实创建/使用 Passkey,解析 attestation/assertion 数据结构 |

## SAML / 证书 / 编码

| 工具 | 用途 |
|------|------|
| [SAML 编解码](./saml.md) | 解码 `SAMLRequest` / `SAMLResponse`(自动识别 Redirect / POST 编码),生成 AuthnRequest 与 Redirect URL |
| [SAML Metadata 解析](./saml-metadata.md) | 解析 metadata:角色、entityID、端点、NameIDFormat,内嵌证书展示有效期/指纹 |
| [SAML Response 解析](./saml-parse.md) | 结构化展示 Response/Assertion:Subject、Conditions、Attributes、签名算法 |
| [X.509 证书解析](./cert.md) | 解析 PEM/DER 证书:主体、颁发者、有效期、公钥/签名算法、SHA-1/SHA-256 指纹 |
| [PEM 解析器](./pem-parse.md) | 识别任意 PEM 块类型(证书/CSR/公私钥/CRL 等),显示 DER 长度与密钥算法 |
| [Base64URL 编解码](./base64url.md) | 文本 ↔ Base64 / Base64URL 互转 |

::: tip 配套 Mock 服务
想端到端联调?见 [Mock 服务器](../mock/):OIDC OP/RP、资源服务器、SAML IdP/SP 四角色齐全,含真实可点的 [OIDC 登录演示](../mock/demo.md)。有想要的工具欢迎到 [GitHub](https://github.com/authn-cn/authn-cn.github.io/issues) 提 issue。
:::
