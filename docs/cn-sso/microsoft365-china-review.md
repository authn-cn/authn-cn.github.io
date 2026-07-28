---
title: "Microsoft 365 中国版接口标准化与安全评价"
---

# Microsoft 365 中国版接口标准化与安全评价

> 采用[统一协议安全评价方法](./methodology.md)。评价 Microsoft 365 中国版供外部应用使用的 OAuth/OIDC、Microsoft Graph 和变更通知，不单独评价 Microsoft Entra IAM 产品。

::: tip 结论
**84.5 / 100（B）**。Microsoft 365 中国版提供标准 OIDC/OAuth、Discovery、JWKS、ID token、PKCE、证书客户端认证、委托/应用权限和版本化 Graph API，是本组标准互操作性最强的产品。未达到 A 的主要原因是中国国家云端点资料存在历史/页面差异、功能可用性落后或不同于全球云，Graph 基础通知主要依赖 `clientState` 而非统一消息签名，目录生命周期也不等同于对外 SCIM Provider。
:::

## 统一评分

| 技术维度 | 权重 | 分数 | 依据 |
|---|---:|---:|---|
| 身份联邦与协议互操作 | 20% | 4.5 | 标准 OIDC/OAuth、Discovery、JWKS、ID token 与 Graph；国家云端点和功能差异要求专门配置 |
| 授权流程安全 | 15% | 4.5 | 授权码 + PKCE、state/nonce、客户端凭据和 OBO 流程成熟；中国租户实际策略仍需验收 |
| 令牌与客户端凭据安全 | 15% | 4.0 | audience/tenant 明确，支持证书/`private_key_jwt` 与短期 token；高级发送方约束及国家云覆盖未完全验证 |
| 权限模型与最小授权 | 15% | 4.5 | 委托/应用/RSC 权限、管理员同意和最低权限参考完整；目录级权限仍易被过度授予 |
| 密码学与密钥生命周期 | 10% | 4.5 | JWT、JWKS、`kid`、签名密钥轮换和证书凭据可用 |
| 主体标识与账号生命周期 | 10% | 3.5 | tenant/object/sub 作用域明确并有目录 API；对外 SCIM Provider 和跨国家云生命周期互操作不足 |
| 回调、事件与防重放 | 10% | 3.5 | HTTPS 验证、subscription/clientState、生命周期通知和通知 ID 可用；基础通知缺统一强消息签名 |
| API 传输与消息语义 | 5% | 4.5 | HTTPS、Bearer、REST/OData、标准状态码和版本化 Graph；国家云 API 覆盖有差异 |

## 标准符合度判断

- 可肯定：通用 OIDC 客户端可使用 Discovery/JWKS 验证身份，Graph 使用标准 OAuth token。
- 不能混用：中国和全球租户、authority、issuer、audience、Graph 根地址与 token 完全隔离。
- 主要缺口：国家云文档中的身份基地址应从目标租户 metadata 消歧；Graph 通知真实性更多依赖订阅秘密和后续取数。

## 平台改进顺序

1. 统一中国国家云所有文档中的 authority 命名，并公开明确的端点迁移和兼容时间表。
2. 为国家云发布与全球云同粒度的 API/SDK/通知能力矩阵和机器可读 capability metadata。
3. Graph 通知增加标准 JWS 或 HTTP Message Signatures，并提供自动轮换的签名密钥。
4. 为 Microsoft 365 用户/组向外部 SaaS 提供标准 SCIM 服务角色或更清晰的标准供应桥接。

## 接入方当前控制

- 将 cloud、tenant、authority、Graph base URL 和 audience 作为原子配置，并运行跨云拒绝测试。
- 公共客户端强制 PKCE，后端优先证书客户端认证；严格验证 issuer/audience/nonce/签名。
- Graph 权限按最小资源选择，应用权限必须管理员审批并定期复核。
- 通知校验 clientState、tenant、subscription、时间与幂等键，敏感变更再次调用 Graph确认。

## 官方资料

- [Microsoft Entra 国家云身份验证](https://learn.microsoft.com/zh-cn/entra/identity-platform/authentication-national-cloud)
- [Microsoft Graph 国家云部署](https://learn.microsoft.com/zh-cn/graph/deployments)
- [Microsoft Graph 权限参考](https://learn.microsoft.com/zh-cn/graph/permissions-reference)
- [Microsoft Graph Webhook](https://learn.microsoft.com/zh-cn/graph/change-notifications-delivery-webhooks)

> 核验日期：2026-07-28。
