---
title: "Gitee 开放平台身份接口标准化与安全评价"
---

# Gitee 开放平台身份接口标准化与安全评价

> 采用[统一协议安全评价方法](./methodology.md)。评价用户 OAuth、企业 API token 与 Webhook，不按仓库功能或 SDK数量加分。

::: tip 结论
**47.5 / 100（D）**。Gitee 的授权码 API、企业 token 和官方 SDK可支持开发者生态接入，但未验证完整 OIDC、PKCE、标准 token 生命周期和现代客户端认证。Webhook 共享值随请求明文传送、缺少消息签名和重放字段，是明显的协议安全短板。
:::

## 统一评分

| 技术维度 | 权重 | 分数 | 依据 |
|---|---:|---:|---|
| 身份联邦与协议互操作 | 20% | 2.5 | OAuth 式授权码与 API 可用；未验证 OIDC Discovery、ID token、JWKS 或标准 UserInfo |
| 授权流程安全 | 15% | 2.5 | code/state 可实施；历史密码模式和未验证的 PKCE/精确回调降低新系统得分 |
| 令牌与客户端凭据安全 | 15% | 2.0 | 用户/企业 token 可区分；标准吊销、刷新重放、非对称认证和发送方约束未验证 |
| 权限模型与最小授权 | 15% | 3.0 | 用户、企业和仓库资源可分层，但标准 resource/audience 与细粒度 scope 证据有限 |
| 密码学与密钥生命周期 | 10% | 2.0 | HTTPS 可用；OAuth/JWKS密钥发布和 Webhook 现代签名/轮换不足 |
| 主体标识与账号生命周期 | 10% | 2.5 | 用户/企业/仓库 ID 可建模；标准 subject、注销/停用事件和 SCIM 未验证 |
| 回调、事件与防重放 | 10% | 1.5 | Webhook 仅共享值，缺少消息签名、时间戳/nonce 和标准重放保护 |
| API 传输与消息语义 | 5% | 3.0 | REST/JSON API 与 SDK可用；身份和错误模型仍为平台私有 |

## 标准符合度判断

- 可肯定：授权码、用户 API、企业 token 和事件通知可用于生产集成。
- 不能等同：SDK不构成 OIDC；企业 token 不是用户身份；Webhook 共享值不是 HMAC/JWS。
- 主要风险：历史授权模式、token 生命周期证据不足，以及事件可伪造/重放的补偿成本。

## 平台改进顺序

1. 提供完整 OIDC、Discovery/JWKS、ID token、UserInfo 和标准注销。
2. 禁止密码与 Implicit 等遗留模式，所有公共客户端强制授权码 + PKCE。
3. 提供标准 revocation/introspection、刷新轮换重放检测及非对称客户端认证。
4. Webhook 改用 HMAC-SHA-256 或 JWS，覆盖原始消息并包含 timestamp、事件 ID、`kid` 和轮换。

## 接入方当前控制

- OAuth 只用授权码，用户 token 与企业 token 分权分库存储。
- Webhook 进入独立低权限网关，增加内部 HMAC、幂等/重放缓存和高风险动作二次授权。
- 用 `(gitee, client_id, user_id)` 保存用户，不使用用户名或企业 token 作为身份主键。

## 官方资料

- [Gitee API v5 OAuth](https://gitee.com/api/v5/oauth_doc)
- [Gitee Webhook](https://gitee.com/help/articles/4184)
- [Gitee 企业 token](https://gitee.com/help/articles/4378)

> 核验日期：2026-07-27。
