---
title: "阿里云上的 Salesforce 接口标准化与安全评价"
---

# 阿里云上的 Salesforce 接口标准化与安全评价

> 采用[统一协议安全评价方法](./methodology.md)。评价中国 org 供外部系统使用的连接应用、OAuth、API 与事件，不评价 Salesforce 自身 IAM 功能。

::: tip 结论
**72 / 100（B）**。Salesforce 连接应用支持 OAuth、SAML/OIDC、PKCE、JWT Bearer、token 轮换/撤销和细粒度权限，REST/事件接口也相对成熟；但中国架构公开资料只承诺并要求核验 API V31+，不能推定全球所有协议、端点和事件功能在中国 org 同步可用。全球能力与中国可验证能力之间的证据缺口是主要扣分项。
:::

## 统一评分

| 技术维度 | 权重 | 分数 | 依据 |
|---|---:|---:|---|
| 身份联邦与协议互操作 | 20% | 3.5 | 连接应用框架支持 SAML/OAuth/OIDC；中国 org 的具体 Discovery、端点和功能覆盖需逐租户验证 |
| 授权流程安全 | 15% | 3.5 | 授权码 + PKCE 和 2026 强化控制可用；全球仍有多种遗留流程，中国执行范围需确认 |
| 令牌与客户端凭据安全 | 15% | 3.5 | refresh 轮换/TTL、撤销、introspection、JWT Bearer/证书可选；旧默认可长期有效 |
| 权限模型与最小授权 | 15% | 4.0 | scope、integration user、profile、permission set、共享与字段权限多层约束 |
| 密码学与密钥生命周期 | 10% | 4.0 | JWT Bearer、证书与 HTTPS 可用；中国 org 的密钥发布/轮换证据不如标准 OIDC metadata 完整 |
| 主体标识与账号生命周期 | 10% | 3.5 | org/user ID 和用户停用可建模；中国/全球 org 隔离、对外 SCIM 与标准 subject 证据有限 |
| 回调、事件与防重放 | 10% | 3.0 | Pub/Sub、CDC、事件 ID、replay ID 和 72 小时恢复可用；不是统一签名 Webhook，国内覆盖需验收 |
| API 传输与消息语义 | 5% | 4.0 | 版本化 REST/SOAP/Bulk/PubSub API成熟；中国公开资料只明确 V31+ 兼容边界 |

## 标准符合度判断

- 可肯定：连接应用使用标准 OAuth/SAML/OIDC，支持 PKCE、token 生命周期策略和证书类服务端流程。
- 不能推定：中国 org 不能仅因全球 Salesforce 支持某功能就自动得分，必须给出实际 endpoint、metadata 与调用证据。
- 主要风险：连接应用权限过大、共享 integration user、长期 refresh token，以及中国/全球 org 的配置和数据边界混用。

## 平台改进顺序

1. 公开中国 org 的协议端点、Discovery/JWKS、OAuth flow、API 和事件能力矩阵，而不只在销售材料中要求联系确认。
2. 中国新连接应用默认强制 PKCE、refresh 轮换、固定/空闲 TTL，并淘汰 User-Agent/密码等遗留流程。
3. 统一证书/`kid` 轮换与自动化 metadata，为高风险 API支持发送方约束 token。
4. 中国事件服务公开签名、订阅身份、重放和跨区域数据边界的一致规范。

## 接入方当前控制

- 所有能力在目标中国 org 实测；记录 My Domain、org ID、instance URL、API version 和可用 flow。
- 每个集成使用独立 integration user、最小 permission set 和独立连接应用。
- 公共客户端强制 PKCE；服务端优先 JWT Bearer/证书；开启 refresh 轮换和 TTL。
- 保存事件 ID/replay ID并设计断线恢复；中国与全球 org 的 token、用户和事件游标完全隔离。

## 官方资料

- [阿里云上的 Salesforce 中国架构](https://www.alibabacloud.com/help/en/sfoa/user-guide/china-architecture-datasheet-of-salesforce-on-alibaba-cloud)
- [Salesforce 连接应用](https://help.salesforce.com/s/articleView?id=xcloud.connected_app_overview.htm&language=zh_CN&type=5)
- [OAuth 与 token 安全设置](https://help.salesforce.com/s/articleView?id=sf.connected_app_create_api_integration.htm&language=en_US&type=5)
- [2026 PKCE 与 refresh token 强化](https://help.salesforce.com/s/articleView?id=005388177&language=en_US&type=1)
- [事件 ID 与 replay ID](https://developer.salesforce.com/docs/platform/pub-sub-api/guide/event-message-durability.html)

> 核验日期：2026-07-28。
