---
title: 工具总览
---

# 在线工具

本站提供一组面向认证协议调试的在线小工具。**全部逻辑在浏览器本地运行,你的 token / 报文不会被上传到任何服务器**,可放心粘贴调试数据。

## 已上线

| 工具 | 用途 |
|------|------|
| [JWT 解析器](./jwt.md) | 解码 JWT 的 Header / Payload,自动解读 `exp`、`iat`、`nbf` 等时间类 claims 并判断是否过期 |
| [SAML 编解码](./saml.md) | 解码 `SAMLRequest` / `SAMLResponse`（自动识别 Redirect / POST Binding 编码）,以及按表单生成 AuthnRequest 与 Redirect URL |

## 规划中

- **OIDC Discovery 查看器** —— 输入 issuer,拉取并解读 `/.well-known/openid-configuration` 与 JWKS
- **PKCE 生成器** —— 生成 `code_verifier` / `code_challenge`（S256）
- **SAML Metadata 解析器** —— 提取 EntityID、证书、端点等关键信息

::: tip 反馈
有想要的工具？欢迎到 [GitHub 仓库](https://github.com/authn-cn/authn-cn.github.io/issues) 提 issue。
:::
