---
title: "WPS 365 身份接口标准化与安全评价"
---

# WPS 365 身份接口标准化与安全评价

> 采用[统一协议安全评价方法](./methodology.md)。评价对象是 WPS 365 提供给外部系统的身份、授权、API 和回调接口。

::: tip 结论
**53.5 / 100（D）**。WPS 365 的用户/应用 token、权限分层和请求签名具备生产接入基础，但企业登录是平台约定的三端点契约，对外授权也未验证完整 OIDC。查询串凭据示例与 Webhook 的 MD5/SHA-1 设计降低了新系统安全基线，接入必须置于专用网关。
:::

## 统一评分

| 技术维度 | 权重 | 分数 | 依据 |
|---|---:|---:|---|
| 身份联邦与协议互操作 | 20% | 2.5 | 有 OAuth 式授权；企业 SSO 为私有三端点，未验证 OIDC Discovery、`id_token`、JWKS 或标准 SAML metadata |
| 授权流程安全 | 15% | 2.5 | 授权码、`state` 和一次性期限可用；未验证公共客户端强制 PKCE、`nonce` 和全部回调精确匹配 |
| 令牌与客户端凭据安全 | 15% | 2.0 | 有用户/应用 token 与刷新轮换；示例含查询串 Secret，未验证标准吊销、重放检测或发送方约束 |
| 权限模型与最小授权 | 15% | 4.0 | scope、应用可见范围、字段和数据权限多层约束 |
| 密码学与密钥生命周期 | 10% | 2.5 | OpenAPI 有版本化请求签名；Webhook 仍包含 MD5/SHA-1，未验证统一 `kid` 和自动轮换 |
| 主体标识与账号生命周期 | 10% | 3.0 | `user_id` 企业作用域有说明；未验证标准 `iss/sub`、SCIM 与完整撤销事件 |
| 回调、事件与防重放 | 10% | 2.5 | Webhook 有时间窗与签名，但算法遗留且窗口较长，标准事件 ID/nonce 能力未统一验证 |
| API 传输与消息语义 | 5% | 2.0 | HTTPS/Bearer 可用；私有头、错误和查询串凭据降低互操作与日志安全 |

## 标准符合度判断

- 可肯定：授权码、scope、用户/应用调用身份、权限层级和请求签名是可用安全控制。
- 不能等同：WPS 三端点 SSO 不是 OIDC；`access_token` 不是 `id_token`；通讯录 API 不是 SCIM；KSO/WPS 签名不是标准客户端认证。
- 主要风险：Secret/Token 的 URL 暴露面、刷新长期授权、私有标识映射，以及 Webhook 遗留摘要算法。

## 平台改进顺序

1. 同时提供标准 OIDC Provider 和 SAML metadata，保留现有三端点作为兼容层。
2. 公共客户端强制授权码 + PKCE，发布授权服务器 metadata、JWKS、标准吊销和刷新重放检测。
3. 用 HMAC-SHA-256 或 JWS 替代 Webhook 的 MD5/SHA-1，加入 `kid`、事件 ID 和更短重放窗口。
4. 为企业用户、组与停用提供 SCIM 2.0；统一 `iss + sub + tenant` 的作用域说明。

## 接入方当前控制

- 将 WPS 适配器放在身份/API 网关中，后端兑换 token，URL 与全链路日志脱敏。
- 以企业、应用、用户复合键存储主体与 token；刷新采用串行和原子更新。
- Webhook 只接低风险异步事件，高风险动作增加企业自己的二次签名和审批。

## 官方资料

- [WPS SSO 登录](https://open.wps.cn/documents/app-integration-dev/collaboration-middleware/server/SSO-login)
- [WPS 用户授权流程](https://open.wps.cn/documents/app-integration-dev/wps365/server/certification-authorization/user-authorization/flow)
- [WPS 权限说明](https://open.wps.cn/documents/app-integration-dev/guide/permission)
- [WPS Webhook](https://open.wps.cn/documents/app-integration-dev/guide/robot/webhook)

> 核验日期：2026-07-27。未验证表示公开资料不足，不推定平台内部能力。
