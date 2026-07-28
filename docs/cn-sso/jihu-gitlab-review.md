---
title: "极狐 GitLab 接口标准化与安全评价"
---

# 极狐 GitLab 接口标准化与安全评价

> 采用[统一协议安全评价方法](./methodology.md)。评价具体极狐实例提供的 OAuth、API、token 和 Webhook，不以 GitLab.com 的能力替代。

::: tip 结论
**73.5 / 100（B）**。极狐 GitLab 提供授权码 + PKCE、state、scope、token 撤销、REST/GraphQL，以及新版 HMAC-SHA-256 Webhook、时间戳和幂等 ID，标准安全基础较强。主要扣分来自未验证完整 OIDC ID token/Discovery/JWKS、仍支持 ROPC 和查询参数 token、设备授权文档前后不一致，以及旧版明文 Webhook token 的兼容负担。
:::

## 统一评分

| 技术维度 | 权重 | 分数 | 依据 |
|---|---:|---:|---|
| 身份联邦与协议互操作 | 20% | 3.0 | 标准 OAuth Provider 和 UserInfo 形态可用；未验证完整 OIDC ID token、Discovery 和 JWKS |
| 授权流程安全 | 15% | 4.0 | 授权码 + S256 PKCE、state、HTTPS 指引完整；仍保留 ROPC，设备授权说明矛盾 |
| 令牌与客户端凭据安全 | 15% | 3.5 | refresh、revoke、token info 和 Bearer 可用；仍兼容查询参数/Git URL token，非对称客户端认证未验证 |
| 权限模型与最小授权 | 15% | 4.0 | 用户/群组/实例应用、scope 和多类资源 token 可细分 |
| 密码学与密钥生命周期 | 10% | 3.5 | Webhook HMAC-SHA-256、时间戳可用；OAuth 无 JWKS/`kid`，应用 Secret 更新会中断旧凭据 |
| 主体标识与账号生命周期 | 10% | 3.5 | 实例、用户、群组、项目和机器人主体可建模；无标准 OIDC subject/SCIM Provider 证据 |
| 回调、事件与防重放 | 10% | 4.5 | 新版签名 token、HMAC、timestamp、webhook ID 和幂等键完整；旧明文 token 仍兼容 |
| API 传输与消息语义 | 5% | 4.0 | REST v4、GraphQL、HTTPS/Bearer 与状态码成熟；查询 token 和部分私有语义仍存在 |

## 标准符合度判断

- 可肯定：PKCE、state、scope、撤销和现代 Webhook 已接近统一安全基线。
- 不能等同：`/oauth/userinfo` 路径本身不证明完整 OIDC；没有 ID token/issuer/JWKS 证据时仍是 OAuth 用户 API。
- 产品边界：JihuLab.com、私有化实例和 GitLab.com 是不同 issuer，主体与 token 不可跨实例复用。

## 平台改进顺序

1. 发布完整 OIDC Provider、Discovery、JWKS、签名 ID token、标准注销和一致性测试。
2. 禁用新应用 ROPC 和查询参数 token；公共客户端强制 PKCE，生产回调强制 HTTPS。
3. 消除设备授权文档矛盾；符合 RFC 8628 时发布 metadata 和测试向量，否则明确不支持。
4. 新 Webhook 默认只启用签名 token，并提供 `kid`/多密钥并行与轮换。

## 接入方当前控制

- 记录 instance origin + user ID，绝不把全球 GitLab 或另一私有实例的 ID 合并。
- 只用授权码 + PKCE；token 放授权头，禁用 ROPC 和 URL/Git remote 内嵌 token。
- Webhook 强制 HMAC、timestamp 和 webhook ID 去重，完成迁移后删除旧 `X-Gitlab-Token`。
- OAuth 用户 token、项目/群组/部署/作业 token 分类型、分用途存储。

## 官方资料

- [极狐 GitLab OAuth 2.0 API](https://gitlab.cn/docs/jh/api/oauth2.html)
- [极狐 GitLab OAuth Provider](https://gitlab.cn/docs/jh/integration/oauth_provider/)
- [极狐 GitLab Webhook](https://docs.gitlab.cn/docs/jh/user/project/integrations/webhooks/)
- [极狐 GitLab 扩展 API](https://gitlab.cn/docs/jh/api/_index/)

> 核验日期：2026-07-28。
