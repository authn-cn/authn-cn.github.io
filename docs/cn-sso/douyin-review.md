---
title: "抖音开放平台身份接口标准化与安全评价"
---

# 抖音开放平台身份接口标准化与安全评价

> 采用[统一协议安全评价方法](./methodology.md)。只评价外部应用所接触的抖音授权、token、用户标识和撤销回调。

::: tip 结论
**56.5 / 100（C）**。抖音的后端授权码、scope、刷新轮换和解除授权回调具备生产基础，客户端/用户 token 边界也较清楚；但用户身份依赖平台私有接口与标识，未验证完整 OIDC、PKCE 强制、标准吊销和非对称客户端认证。
:::

## 统一评分

| 技术维度 | 权重 | 分数 | 依据 |
|---|---:|---:|---|
| 身份联邦与协议互操作 | 20% | 2.5 | OAuth 式授权码可用；未验证 OIDC Discovery、`id_token`、JWKS 与标准 UserInfo |
| 授权流程安全 | 15% | 3.0 | code、state 与后端换 token 可用；所有公共客户端强制 PKCE 和精确回调策略未验证 |
| 令牌与客户端凭据安全 | 15% | 2.5 | 用户/客户端 token 分离且 refresh token 轮换；标准吊销、重放检测与发送方约束未验证 |
| 权限模型与最小授权 | 15% | 3.0 | scope 和应用审核可限制权限，但资源/audience 和错误语义私有 |
| 密码学与密钥生命周期 | 10% | 2.5 | TLS 与应用 Secret 可用；未验证 JWKS、非对称客户端认证和统一密钥轮换 |
| 主体标识与账号生命周期 | 10% | 3.0 | 应用作用域标识和解除授权可处理；无标准 `iss/sub` 与通用注销/SCIM |
| 回调、事件与防重放 | 10% | 3.5 | 有解除授权回调和授权码一次性语义；签名、事件 ID 与重放细节仍是平台契约 |
| API 传输与消息语义 | 5% | 3.0 | HTTPS 与后端 POST 可用；响应、错误和身份字段私有 |

## 标准符合度判断

- 可肯定：授权码后端兑换、token 类型区分、refresh token 轮换和解除授权通知。
- 不能等同：`open_id` 与用户信息 API 不构成 OIDC；SDK 不增加标准化得分。
- 维护风险：部分旧版 OpenAPI SDK 已停止维护，协议兼容测试需由接入方负责。

## 平台改进顺序

1. 提供完整 OIDC Provider、Discovery、JWKS、ID token 和标准 UserInfo。
2. 所有公共客户端强制 PKCE，明确 state、nonce、redirect URI 与原生应用回跳。
3. 发布标准 revocation/introspection、刷新重放检测和非对称客户端认证。
4. 撤销事件采用 JWS/HMAC-SHA-256，明确 `kid`、时间窗、事件 ID 和重试语义。

## 接入方当前控制

- 后端兑换 code，token 加密存储并按应用/用户隔离；刷新原子更新。
- 解除授权回调经过验签、时间校验和幂等后再关闭本地会话。
- 用 `(douyin, client_key, open_id)` 保存主体，由身份网关签发企业自己的会话。

## 官方资料

- [抖音 OAuth2 网页授权](https://open.douyin.com/platform/resource/docs/develop/permission/web/oauth2)
- [抖音网页授权接入](https://open.douyin.com/platform/resource/docs/develop/permission/web/permission)
- [抖音登录与授权 SDK](https://open.douyin.com/platform/resource/docs/develop/summarize/sdk/)

> 核验日期：2026-07-27。
