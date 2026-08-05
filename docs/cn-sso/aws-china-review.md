---
title: "亚马逊云科技中国区域接口标准化与安全评价"
---

# 亚马逊云科技中国区域接口标准化与安全评价

> 采用[统一协议安全评价方法](./methodology.md)。本页评价中国区域管理控制台的企业身份接入，以及外部工作负载调用服务 API 的协议面；不把 IAM Identity Center 作为独立 IDaaS 产品评价。

::: tip 结论
**82 / 100（B）**。中国区域的 IAM Identity Center 为企业控制台接入提供标准 SAML 2.0 认证和 SCIM 2.0 账号预置，配合集中权限集、短期角色会话和 CLI 设备授权，企业身份基础较完整；普通服务 API 则继续依赖专用 STS + SigV4/SigV4a。主要缺口是外部身份源登录未提供与 SAML 等价的通用 OIDC 路径，Identity Center 的 OIDC 与可信令牌颁发者有明确的 CLI/应用边界，不能当作控制台 OAuth 登录。
:::

## 统一评分

| 技术维度 | 权重 | 分数 | 依据 |
|---|---:|---:|---|
| 身份联邦与协议互操作 | 20% | 4.0 | IAM Identity Center 外部身份源支持标准 SAML 2.0，人员预置支持 SCIM 2.0；传统 IAM 也支持 SAML 控制台联邦，但外部身份源未提供等价 OIDC 登录 |
| 授权流程安全 | 15% | 3.5 | SAML 联邦、短期角色会话和 CLI Device Authorization 基础成熟；OIDC API 只实现 CLI 所需子集，服务 API 授权状态机仍为平台专用 |
| 令牌与客户端凭据安全 | 15% | 4.5 | STS 短期凭据、角色会话、外部 ID、区域端点和 CLI 自动轮换成熟；仍允许长期 access key，SCIM bearer token 需自行轮换治理 |
| 权限模型与最小授权 | 15% | 5.0 | 权限集、账户分配、action/resource/condition、信任策略、会话策略、标签和组织边界细粒度 |
| 密码学与密钥生命周期 | 10% | 4.5 | SAML X.509 验签和 SigV4/SigV4a 请求绑定成熟；外部 IdP AuthnRequest 不签名、SAML 断言加密不受支持，证书轮换仍需严谨运维 |
| 主体标识与账号生命周期 | 10% | 4.0 | SCIM 2.0 支持用户/组预置和停用，account/role/session/source identity 清楚；NameID 必须精确匹配 Username，跨分区主体不可合并 |
| 回调、事件与防重放 | 10% | 3.0 | 多种事件/队列服务有 ID、签名和重试能力，但没有统一跨服务回调协议 |
| API 传输与消息语义 | 5% | 4.0 | HTTPS、明确 request ID 和服务 API 语义成熟；canonicalization、端点与错误模型专用 |

## 标准符合度判断

- 可肯定：企业员工可经 SAML 2.0 登录中国区访问门户/控制台，用户和组可经 SCIM 2.0 同步；多账户权限集和短期角色会话形成完整访问链路。
- 必须区分：IAM Identity Center OIDC Device Authorization 面向 CLI 登录；可信令牌颁发者面向支持可信身份传播的应用；IAM OIDC Provider 多用于 Web Identity/工作负载。三者都不能自动证明外部企业 IdP 可用 OIDC 直接登录管理控制台。
- 不能等同：SigV4 是安全的厂商协议，不是 OAuth；外部 OAuth/OIDC token 不能直接发送到普通服务 API。
- 主要风险：SAML NameID 与 SCIM Username 漂移、SCIM token 泄露或过期、外部 IdP/主要区域故障、长期 access key、错误分区/区域、手写签名和中国/全球配置串用。

## 平台改进顺序

1. 为 IAM Identity Center 外部身份源并行提供标准 OIDC Federation，并公布中国区域 Discovery、claims、会话和登出语义。
2. 为 SAML 增加已签名 AuthnRequest、断言加密和自动化双证书轮换，降低企业 IdP 配置与换钥风险。
3. 对适合第三方委托的服务并行提供标准 OAuth 2.0 resource indicator、metadata 和 token exchange，并清晰发布中国区域能力矩阵。
4. 默认关闭新账户根用户 access key，并让工作负载身份/短期凭据成为所有 SDK 的无静态密钥默认。
5. 为跨服务事件提供统一的 CloudEvents + JWS/HTTP Message Signatures、事件 ID 与轮换模型。

## 接入方当前控制

- 多账户优先使用 IAM Identity Center + SAML + SCIM；单账户直连 IAM SAML 时，逐账户治理 Provider、角色信任、`saml:aud` 和权限策略。
- 把 SAML NameID、SCIM Username 与稳定 `externalId` 的映射纳入契约测试；演练入职、转岗、离职、改名、证书和 SCIM token 轮换。
- 中国与全球账户、组织、身份源、ARN、端点、配置文件和 Secret 完全隔离。
- 优先 STS 角色和区域端点，缩短会话；禁止客户端、仓库和镜像持有静态 key。
- 建立不依赖外部 IdP 的受控紧急访问路径，并监控 `ExternalIdPDirectoryLogin`、角色会话与异常权限集分配。

## 官方资料

- [IAM Identity Center 在中国区域的可用性与差异](https://docs.amazonaws.cn/en_us/aws/latest/userguide/iam-identity-center.html)
- [外部 IdP 的 SAML 与 SCIM 互操作要求](https://docs.amazonaws.cn/en_us/singlesignon/latest/userguide/other-idps.html)
- [IAM Identity Center 外部身份提供商](https://docs.amazonaws.cn/en_us/singlesignon/latest/userguide/manage-your-identity-source-idp.html)
- [SAML 联邦访问中国区域管理控制台](https://docs.amazonaws.cn/en_us/IAM/latest/UserGuide/id_roles_providers_enable-console-saml.html)
- [IAM Identity Center OIDC API](https://docs.amazonaws.cn/en_us/singlesignon/latest/OIDCAPIReference/Welcome.html)
- [可信令牌颁发者](https://docs.amazonaws.cn/en_us/singlesignon/latest/userguide/using-apps-with-trusted-token-issuer.html)
- [SigV4](https://docs.amazonaws.cn/IAM/latest/UserGuide/reference_sigv.html)
- [`aws-cn` 分区边界](https://docs.amazonaws.cn/accounts/latest/reference/manage-acct-regions.html)

> 核验日期：2026-08-05。
