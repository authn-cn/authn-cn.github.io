---
title: "钉钉 API / SDK 企业集成评价"
---

# 钉钉 API / SDK 企业集成评价

> 使用[统一评价方法](./methodology.md)。本页重点是企业内部应用或第三方企业应用调用钉钉 OpenAPI 与事件能力，而不是只讨论扫码登录是否等同标准 OIDC。

::: tip 结论
**89.5 / 100（A）**。钉钉具备广泛的企业业务 API、六种 OpenAPI 服务端 SDK，以及 Java/Node.js/Python/Go 四种官方 Stream SDK。Stream 模式让事件、机器人消息和卡片回调无需公网入口即可接入。主要成本是新旧 API/SDK 并存、私有字段与错误语义、文档入口分散，以及 SLA/全局配额需要商务确认。
:::

## 统一评分

| 维度 | 分数 | 企业判断 |
|---|---:|---|
| 场景与企业适配 | 5.0 | 企业内部应用、第三方企业应用和服务商场景成熟 |
| API 覆盖与可组合性 | 5.0 | 通讯录、消息、审批、考勤、日历、机器人、卡片等覆盖广 |
| SDK 与开发工具 | 4.5 | OpenAPI SDK 六种语言，Stream SDK 四种语言；不同代 SDK 需选型 |
| 身份、权限与数据边界 | 4.0 | 应用/用户凭据和权限可用，但用户 ID 与字段语义需适配 |
| 事件与数据同步 | 5.0 | Stream 与 HTTP 回调并存，覆盖事件、机器人和卡片回调 |
| 运行与可观测性 | 4.0 | 接口错误码和限流可查；统一状态、SLA 和扩容承诺不充分 |
| 文档、测试与版本治理 | 4.0 | 文档和示例丰富，但新旧入口、历史接口与 SDK 容易混用 |
| 企业交付与合规 | 4.0 | 应用审核和授权体系成熟；高权限、专属版和服务承诺需确认 |

## API 与 SDK 能力

钉钉开放平台的企业价值来自组织和业务资源，而不仅是登录。典型外部调用包括通讯录、部门、消息、群、机器人、互动卡片、审批、考勤、日历和工作台。企业内部应用面向单个组织；第三方企业应用需要实现多租户授权、按租户保存凭据并处理授权变更。

OpenAPI 服务端 SDK公开覆盖 Java、Node.js、PHP、Go、C#、Python。事件侧另有 Stream SDK，官方覆盖 Java、Node.js、Python、Go。两类 SDK 的职责不同：

- OpenAPI SDK 用于主动调用资源接口；
- Stream SDK 用于通过 WebSocket 接收事件、机器人消息和卡片回调，并封装连接、ACK 等协议；
- Stream SDK 只封装部分常用 OpenAPI，不能替代完整 OpenAPI SDK。

## 事件和同步

Stream 模式不要求企业暴露公网 IP、域名或回调 URL，适合内网服务和快速联调。传统 HTTP 回调仍适用于既有网关架构。生产设计应把两者都视为至少一次投递：

1. 按事件唯一标识去重，处理结果必须幂等；
2. 先 ACK，再把业务操作放入队列；
3. 对员工、部门、审批等关键数据做定期对账或增量补偿；
4. 多实例消费时验证同一事件的分发语义，不把长连接当广播总线。

## 身份、权限和接口版本

钉钉存在应用级访问凭据、用户授权凭据，以及 `unionId`、`openId`、企业内 `userId` 等不同作用域标识。不要笼统地说“以 `unionId` 作为全局 `sub`”：跨组织、跨开发者主体和跨环境时都必须带作用域。建议用 `(corpId, userId)` 表示企业成员，用 `(app/开发者主体, unionId/openId)` 处理授权登录关系。

新接入应优先使用 `api.dingtalk.com/v1.0` 一代接口与对应 SDK，历史 `oapi.dingtalk.com` 只为既有能力保留。项目必须维护接口清单，禁止同一业务链路无计划地混用新旧端点、鉴权头和数据模型。

## 企业风险与建议

1. **先冻结技术栈**：明确每个业务域用新版还是历史接口、具体 SDK 包和版本；建立升级回归测试。
2. **OpenAPI 与 Stream 分层**：主动调用、事件消费、身份映射分别封装，不让 SDK 类型泄漏到业务层。
3. **建立租户隔离**：第三方应用的 corpId、token、事件密钥、配额和审计必须逐租户隔离。
4. **按作用域保存用户 ID**：不要在数据库中混存 `unionId`、`openId`、`userId`；记录来源和转换关系。
5. **把限流和错误码标准化**：集中映射参数、权限、令牌、配额和服务端错误；只对明确可重试错误退避。
6. **采购时补齐非公开条件**：专属版能力、生产 SLA、Stream 连接上限、接口扩容和废弃通知期要求书面确认。

## 已修正的旧结论

- “钉钉就是私有 OAuth2 变体”只描述登录接口，不能代表完整开放平台。
- “普通版方向 A 是否支持标准 SAML/OIDC”属于平台自身登录能力，不应作为外部 API/SDK 企业评价的主要分数。
- 没有 OIDC Discovery/JWKS 不影响企业调用通讯录、审批或消息 API；真正要治理的是凭据、权限、事件和版本兼容。

## 官方资料

- [钉钉 OpenAPI 总览](https://open.dingtalk.com/document/orgapp-server/api-overview)
- [钉钉服务端 SDK 下载](https://open.dingtalk.com/document/orgapp/download-the-server-side-sdk)
- [钉钉 SDK 概述：OpenAPI 与 Stream SDK](https://open-dingtalk.github.io/developerpedia/docs/develop/sdk/overview/)
- [钉钉 Stream 协议说明](https://opensource.dingtalk.com/developerpedia/docs/learn/stream/protocol/)
- [钉钉 SSO 概述](https://open.dingtalk.com/document/orgapp/sso-overview)

> 资料核验：2026-07-27。钉钉部分正式文档为动态页面；统一 SLA、专属版能力和配额扩容未在公开资料中完整确认。
