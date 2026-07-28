---
title: "亚马逊云科技中国区域接口标准化与安全评价"
---

# 亚马逊云科技中国区域接口标准化与安全评价

> 采用[统一协议安全评价方法](./methodology.md)。本页评价中国区域供外部系统调用服务 API 的协议面；IAM/STS 只作为鉴权依赖检查，不作为独立产品评价。

::: tip 结论
**73.5 / 100（B）**。亚马逊云科技中国区域在独立分区、短期 STS 凭据、细粒度策略、SigV4 请求绑定和 SDK支持方面安全基础强，但普通服务 API 依赖专用 SigV4/SigV4a，而不是 OAuth 标准资源服务器；端点、ARN 和事件语义也高度服务化。它是安全成熟但厂商适配明显的 ToB API 平台。
:::

## 统一评分

| 技术维度 | 权重 | 分数 | 依据 |
|---|---:|---:|---|
| 身份联邦与协议互操作 | 20% | 2.5 | STS 可承接 OIDC/SAML 联邦，但服务 API 使用专用角色/SigV4；不是通用 OAuth/OIDC 资源服务器 |
| 授权流程安全 | 15% | 3.0 | AssumeRole、Web Identity 和短期会话可用；授权状态机、端点和参数为平台专用 |
| 令牌与客户端凭据安全 | 15% | 4.5 | STS 短期凭据、角色会话、外部 ID 和区域端点成熟；仍允许长期 access key |
| 权限模型与最小授权 | 15% | 5.0 | action/resource/condition、信任策略、会话策略、标签和组织边界非常细 |
| 密码学与密钥生命周期 | 10% | 4.5 | SigV4/SigV4a 绑定请求并使用派生密钥；根 access key 与静态 key 轮换仍依赖治理 |
| 主体标识与账号生命周期 | 10% | 3.5 | account/role/session/source identity 和 `aws-cn` ARN 清楚；不是标准 `iss/sub` 用户生命周期 |
| 回调、事件与防重放 | 10% | 3.0 | 多种事件/队列服务有 ID、签名和重试能力，但没有统一跨服务回调协议 |
| API 传输与消息语义 | 5% | 4.0 | HTTPS、明确 request ID 和服务 API 语义成熟；canonicalization、端点与错误模型专用 |

## 标准符合度判断

- 可肯定：短期角色凭据、请求级签名、细粒度策略和中国/全球硬隔离。
- 不能等同：SigV4 是安全的厂商协议，不是 OAuth；官方 SDK封装不增加协议互操作得分。
- 主要风险：长期 access key、错误分区/区域、手写签名、跨服务事件差异和中国/全球配置串用。

## 平台改进顺序

1. 对适合第三方委托的服务并行提供标准 OAuth 2.0 resource indicator、metadata 和 token exchange。
2. 默认关闭新账户根用户 access key，并让工作负载身份/短期凭据成为所有 SDK的无静态密钥默认。
3. 为跨服务事件提供统一的 CloudEvents + JWS/HTTP Message Signatures、事件 ID 与轮换模型。
4. 发布机器可读的 `aws-cn` 服务端点、认证方案和事件能力矩阵，减少 SDK硬编码。

## 接入方当前控制

- 中国与全球账户、组织、ARN、端点、配置文件和 Secret 完全隔离。
- 优先 STS 角色和区域端点，缩短会话；禁止客户端、仓库和镜像持有静态 key。
- 使用官方 SDK，验证 region/service/endpoint/signing name，保持时间同步。
- 事件按具体服务验证来源、签名、主题/队列策略、事件 ID 和重复投递。

## 官方资料

- [中国区域账户与凭据](https://docs.amazonaws.cn/en_us/aws/latest/userguide/accounts-and-credentials.html)
- [中国区域端点与 ARN](https://docs.amazonaws.cn/en_us/aws/latest/userguide/endpoints-arns.html)
- [SigV4](https://docs.amazonaws.cn/IAM/latest/UserGuide/reference_sigv.html)
- [`aws-cn` 分区边界](https://docs.amazonaws.cn/accounts/latest/reference/manage-acct-regions.html)

> 核验日期：2026-07-28。
