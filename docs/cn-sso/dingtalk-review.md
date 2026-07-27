---
title: "钉钉身份接口标准化与安全评价"
---

# 钉钉身份接口标准化与安全评价

> 采用[统一协议安全评价方法](./methodology.md)。API 数量、OpenAPI SDK 和 Stream SDK 数量均不计分；SDK 能连接私有协议，不代表协议本身标准。

::: tip 结论
**63 / 100（C）**。钉钉的新版登录采用授权码、访问/刷新令牌和后端取用户的 OAuth 式结构，权限与多租户边界也可治理；Stream 通过 TLS 长连接降低了公网回调暴露。但外部应用仍依赖钉钉私有 token 端点、请求头、身份字段和错误模型，公开资料未验证完整 OIDC Discovery/JWKS、PKCE 强制、标准吊销、SCIM 或发送方约束令牌。新旧协议并存进一步削弱互操作性。
:::

## 统一评分

| 技术维度 | 权重 | 分数 | 依据 |
|---|---:|---:|---|
| 身份联邦与协议互操作 | 20% | 2.5 | 新版登录是 OAuth 式私有流程；普通版/专属版的标准 OIDC/SAML 能力不能统一确认 |
| 授权流程安全 | 15% | 3.0 | 授权码和 `state` 可用；PKCE、`nonce`、精确回调和历史 implicit 淘汰状态未完整验证 |
| 令牌与客户端凭据安全 | 15% | 3.0 | 有 access/refresh token；未验证标准吊销、刷新重放检测、非对称客户端认证或 mTLS/DPoP |
| 权限模型与最小授权 | 15% | 4.0 | 应用权限、管理员授权、企业租户和用户授权可分层 |
| 密码学与密钥生命周期 | 10% | 3.0 | HTTPS 与回调加密/Stream 认证可用；标准 JWKS、`kid` 和自动轮换未验证 |
| 主体标识与账号生命周期 | 10% | 3.0 | `corpId/userId` 与 `unionId/openId` 可区分；无公开 SCIM 与标准 `iss/sub` 生命周期证据 |
| 回调、事件与防重放 | 10% | 4.0 | Stream TLS 与 HTTP 回调安全机制较完整；事件协议和 ACK 仍是厂商私有 |
| API 传输与消息语义 | 5% | 3.0 | 新版 HTTPS/JSON 较规范，但私有认证头、错误模型及历史端点并存 |

## 标准符合度判断

- `authorization_code`、`accessToken`、`refreshToken` 的字段外观接近 OAuth，不等于完整符合 OAuth/OIDC；还要验证 metadata、标准端点认证、redirect URI、PKCE、错误和令牌生命周期。
- `users/me` 返回 `unionId/openId` 是平台用户资料，不是可离线验证的 OIDC `id_token`。
- Stream SDK 使用 WebSocket/TLS 是安全传输能力，不是身份联邦标准；它不能补齐 OIDC、SAML 或 SCIM。
- 企业通讯录和组织 API 很丰富，但“能同步组织”不等于提供 SCIM 2.0。
- 历史专属钉钉曾出现 OIDC implicit 方案的资料；RFC 9700 已不建议新系统使用 implicit，当前产品必须按目标版本重新验证，不能沿用历史结论。

## 建议钉钉按此顺序改进

1. 将外部应用登录升级为完整 OIDC Authorization Code Flow，提供 Discovery、JWKS、标准 `id_token`/UserInfo 和一致的 `iss + sub`。
2. 公共客户端强制 PKCE，停止新增 implicit；所有 redirect URI 使用精确匹配。
3. 统一 `api.dingtalk.com` 新协议并公布旧 `oapi` 的迁移和停用计划，避免同一能力长期存在两套鉴权语义。
4. 增加标准 revocation/introspection、刷新令牌轮换与重放检测；高保障服务端支持 `private_key_jwt`、mTLS 或 DPoP。
5. 将企业人员和组开放为 SCIM 2.0，同时保留私有业务字段扩展。
6. 为 Stream/HTTP 事件定义算法版本、`kid`、时间窗和去重标识，并提供标准 JWS 或 mTLS 选项。

## 接入企业当前应做什么

- 在企业身份网关封装钉钉私有流程，对内部应用只暴露标准 OIDC/SAML；业务系统不直接依赖钉钉字段。
- 新项目只使用新版端点，维护禁止混用清单；历史接口通过单独兼容层迁移。
- 以 `(corpId, userId)` 保存企业成员；`unionId/openId` 必须连同开发者主体、应用和环境保存。
- 授权码和 token 只在后端处理；校验 `state`，并在网关层补充一次性 code、回调白名单、事件重放缓存和审计。

## 官方资料

- [钉钉 SSO 概述](https://open.dingtalk.com/document/orgapp/sso-overview)
- [获取用户身份凭证](https://open.dingtalk.com/document/orgapp/obtain-identity-credentials)
- [获取用户信息](https://open.dingtalk.com/document/orgapp/dingtalk-retrieve-user-information)
- [钉钉 Stream 协议](https://opensource.dingtalk.com/developerpedia/docs/learn/stream/protocol/)
- [OAuth 2.0 Security BCP（RFC 9700）](https://datatracker.ietf.org/doc/html/rfc9700)

> 核验日期：2026-07-27。产品版本和专属版能力存在差异，只有当前租户能导出的标准 metadata 与实际互操作结果可作为合规证据。
