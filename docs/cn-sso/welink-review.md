---
title: "华为云 WeLink 身份接口标准化与安全评价"
---

# 华为云 WeLink 身份接口标准化与安全评价

> 采用[统一协议安全评价方法](./methodology.md)。本页只评价 WeLink，不评价华为账号 Account Kit 或华为云 IAM。

::: tip 结论
**55.5 / 100（C）**。WeLink 的后端换票、应用 token、权限与企业成员标识可支撑企业应用接入，但流程、请求头、错误和用户接口仍以平台私有契约为主。公开资料未验证完整 OIDC、PKCE、SCIM、标准吊销或高保障客户端认证。
:::

## 统一评分

| 技术维度 | 权重 | 分数 | 依据 |
|---|---:|---:|---|
| 身份联邦与协议互操作 | 20% | 2.5 | 文档描述 OAuth2 式免登，但未验证 OIDC Discovery、`id_token`、JWKS、SAML metadata 或 SCIM |
| 授权流程安全 | 15% | 2.5 | 短时 code 与后端换票可用；未验证 PKCE、nonce、标准 state 和精确回调策略 |
| 令牌与客户端凭据安全 | 15% | 2.5 | 应用 token 有期限且 Secret 后端提交；未验证标准 revocation/introspection、刷新重放或非对称认证 |
| 权限模型与最小授权 | 15% | 3.5 | 应用权限和可见范围可控制，但 scope/resource 语义为平台私有 |
| 密码学与密钥生命周期 | 10% | 2.5 | TLS 与应用凭据可用；公开资料未验证 JWKS、`kid`、双钥轮换和发送方约束 |
| 主体标识与账号生命周期 | 10% | 3.0 | 企业 `userId` 可映射；离职停用依赖私有通讯录，未验证标准 subject 与 SCIM |
| 回调、事件与防重放 | 10% | 3.0 | 一次性免登 code 提供基础防重放；事件签名、nonce、统一幂等机制未充分验证 |
| API 传输与消息语义 | 5% | 3.0 | HTTPS、后端 JSON 请求可用；自定义授权头和私有 code/message 需要适配 |

## 标准符合度判断

- 可肯定：客户端只交 code、后端保存 Secret 和 token 的基本边界合理。
- 不能等同：`tickets`、`x-wlk-Authorization`、`userId` 是私有契约，不能据此声称 OIDC/SCIM。
- 产品边界：WeLink 企业成员身份不能与 Account Kit 的消费者 subject 或华为云 IAM 用户合并。

## 平台改进顺序

1. 为外部应用提供完整 OIDC Provider、Discovery、JWKS、标准 UserInfo 和授权服务器 metadata。
2. 公共客户端强制 PKCE，提供标准撤销、刷新轮换与重放检测。
3. 企业目录开放 SCIM 2.0，并以标准 claims 明确 tenant、subject、组和停用状态。
4. 统一事件 JWS/HMAC-SHA-256 方案，发布算法版本、`kid`、时间窗和事件 ID。

## 接入方当前控制

- 使用独立 WeLink 适配器，由身份网关签发内部会话；不传播平台 access token。
- code 与本地 nonce/会话绑定，token 按企业和应用隔离，Secret 进入密钥管理。
- 通讯录同步显式处理离职、停用、部门变更和幂等，不把私有 API 称为 SCIM。

## 官方资料

- [WeLink 免登流程](https://support.huaweicloud.com/devg-welink/start-05.html)
- [WeLink 获取应用 token](https://support.huaweicloud.com/devg-welink/start-09.html)
- [WeLink 调用开放 API](https://support.huaweicloud.com/devg-welink/start-21.html)

> 核验日期：2026-07-27。
