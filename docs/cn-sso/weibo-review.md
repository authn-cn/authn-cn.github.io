---
title: "微博开放平台身份接口标准化与安全评价"
---

# 微博开放平台身份接口标准化与安全评价

> 采用[统一协议安全评价方法](./methodology.md)。未从公开资料验证的控制保守计分。

::: tip 结论
**40 / 100（D）**。微博可提供 OAuth2 式授权和用户 API，但公开证据不足以证明完整 OIDC、PKCE、标准吊销、刷新重放检测和现代密钥发布。它可以作为隔离的社交登录适配器，不应作为新系统身份协议范本。
:::

## 统一评分

| 技术维度 | 权重 | 分数 | 依据 |
|---|---:|---:|---|
| 身份联邦与协议互操作 | 20% | 2.0 | 有 OAuth2 授权/token API；未验证 Discovery、ID token、JWKS 或标准 UserInfo |
| 授权流程安全 | 15% | 2.0 | 授权码可用；PKCE、nonce、精确回调及遗留流程禁用情况未充分验证 |
| 令牌与客户端凭据安全 | 15% | 1.5 | access token 可用；标准吊销、刷新轮换重放和非对称客户端认证未验证 |
| 权限模型与最小授权 | 15% | 2.5 | 应用权限可申请，但标准 scope/resource/audience 与最小授权细节证据有限 |
| 密码学与密钥生命周期 | 10% | 2.0 | HTTPS 可用；JWKS、`kid`、算法固定与自动轮换未验证 |
| 主体标识与账号生命周期 | 10% | 2.5 | 平台 uid 可映射；标准 subject、解绑、注销和删除事件未充分验证 |
| 回调、事件与防重放 | 10% | 1.5 | code/state 可提供基础控制；签名事件、nonce、幂等和重放机制证据不足 |
| API 传输与消息语义 | 5% | 2.0 | 平台私有端点、字段与错误需要专用适配 |

## 标准符合度判断

- 可肯定：存在授权、token 和用户信息 API，可实现用户同意后的账号绑定。
- 不能等同：OAuth2 路径名不是 OIDC；用户 API 返回 uid 不能替代已验签 ID token。
- 证据约束：官方 Wiki 可读取性有限，不能按厂商规模推定未公开能力存在。

## 平台改进顺序

1. 公开完整 OIDC Provider、Discovery、JWKS、标准 ID token 与 UserInfo。
2. 强制授权码 + PKCE、state/nonce 和 redirect URI 精确匹配，停止新客户端使用 Implicit。
3. 提供标准 revocation/introspection、刷新轮换重放检测与非对称客户端认证。
4. 公开解除授权/账号删除事件的现代签名、事件 ID 和重放窗口。

## 接入方当前控制

- code 只在后端兑换，强制 state；Secret/token 加密存储并做全链路日志脱敏。
- 以 `(weibo, app_key, uid)` 保存主体，由身份网关签发内部短会话。
- 将未验证的 token、回调和注销能力列为采购验收项，而不是默认存在。

## 官方资料

- [微博 OAuth2 授权接口](https://open.weibo.com/wiki/Oauth2/authorize)
- [微博 OAuth2 token 接口](https://open.weibo.com/wiki/Oauth2/access_token)
- [微博用户信息接口](https://open.weibo.com/wiki/2/users/show)

> 核验日期：2026-07-27。
