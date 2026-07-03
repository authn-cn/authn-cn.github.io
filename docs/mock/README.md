---
title: Mock 服务器
---

# Mock 服务器（规划中）

本板块计划提供一组**开箱即用的在线 Mock 服务**,覆盖 SAML 与 OIDC 协议的两端角色,用于:

- **联调**:你在开发 SP / RP 时,不必先搭一套 Keycloak / ADFS,直接对接本站的 Mock IdP / OP
- **集成测试**:CI 中以固定、可预期的响应验证你的认证集成代码
- **学习演练**:配合[协议文档](../saml/),实际观察每一步报文长什么样

## 规划清单

| 服务 | 角色 | 主要能力 | 状态 |
|------|------|----------|------|
| Mock SAML IdP | 身份提供方 | 提供 Metadata、SSO 端点;可配置 NameID、属性、签名证书;支持 SP-initiated 与 IdP-initiated | 🚧 规划中 |
| Mock SAML SP | 服务提供方 | 提供 Metadata、ACS 端点;展示收到的 Response / Assertion 解析结果,用于验证你的 IdP | 🚧 规划中 |
| Mock OIDC OP | OpenID Provider | 完整 Discovery / JWKS / authorize / token / userinfo 端点;可配置 claims 与 token 有效期;支持 PKCE | 🚧 规划中 |
| Mock OIDC RP | Relying Party | 一键向任意 OP 发起登录,逐步展示授权码、token 响应与 ID Token 校验过程 | 🚧 规划中 |

## 技术方案（初步）

- 部署在 **Cloudflare Workers** 上,作为独立服务(本站是纯静态站点,Mock 服务将放在单独的仓库/子域,如 `mock.authn.tech`)
- 无需注册:每次访问自动分配隔离的测试租户,或使用共享的固定测试配置
- 所有密钥/证书均为**公开的测试专用**材料,并在响应中明确标注 —— 切勿用于生产

::: warning
Mock 服务仅用于开发与测试。任何生产系统都不应信任 Mock IdP / OP 签发的断言或令牌。
:::

## 进度

尚未开工。实现进展会在本页更新,也欢迎到 [GitHub](https://github.com/authn-cn/authn-cn.github.io/issues) 参与讨论。
