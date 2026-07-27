---
title: "网易云音乐身份接口标准化与安全评价"
---

# 网易云音乐身份接口标准化与安全评价

> 采用[统一协议安全评价方法](./methodology.md)。本页依据合作方 OpenAPI 资料评价授权、令牌、请求签名和设备登录；内容 API 覆盖与商业交付不计分。

::: tip 结论
**50 / 100（D）**。网易云音乐已有授权码、access/refresh token、RSA-SHA256 请求签名和时间戳校验，密码学选择好于使用 MD5/SHA-1 的私有回调；但整体仍是厂商 OpenAPI，而不是可由通用 OIDC/OAuth 客户端直接接入的公开标准实现。二维码登录使用私有轮询状态码，部分接口把 `clientSecret` 放在业务参数中，且未验证 Discovery/JWKS、PKCE、标准吊销、刷新重放检测或发送方约束令牌。
:::

## 统一评分

| 技术维度 | 权重 | 分数 | 依据 |
|---|---:|---:|---|
| 身份联邦与协议互操作 | 20% | 2.5 | 具备 OAuth 式 AT/RT 与授权码；无完整 OIDC/metadata 互操作证据，设备流私有 |
| 授权流程安全 | 15% | 2.5 | H5 grant code 和二维码授权可用；未验证 PKCE，二维码未对齐 RFC 8628 |
| 令牌与客户端凭据安全 | 15% | 2.0 | AT/RT 有生命周期；`clientSecret` 进入业务参数，标准吊销、重放检测和发送方约束未验证 |
| 权限模型与最小授权 | 15% | 2.5 | 应用/用户资源有边界；标准 scope、audience/resource 与细粒度授权证据有限 |
| 密码学与密钥生命周期 | 10% | 3.5 | RSA-SHA256 和时间戳是有效基础；签名规范化、`kid`、双钥轮换和算法敏捷性未完整验证 |
| 主体标识与账号生命周期 | 10% | 2.5 | 可取平台用户并刷新会话；标准 `iss/sub`、解绑/吊销/注销传播和 SCIM 未验证 |
| 回调、事件与防重放 | 10% | 2.5 | 请求签名与五分钟时间窗可降低伪造/陈旧请求；nonce、事件体系和精确重放检测未验证 |
| API 传输与消息语义 | 5% | 2.0 | HTTPS 可用，但 GET/POST 混用、敏感参数与私有 code/subCode 语义偏离标准基线 |

## 标准符合度判断

- `accessToken`/`refreshToken` 和 `oauth2` 路径只说明采用了相似概念；没有标准 metadata、端点认证、scope、错误和 OIDC claims 时，仍是专用 OpenAPI。
- 用户资料响应不是签名 `id_token`，平台用户 `id` 也不自动具备 `iss + sub` 的跨客户端语义。
- 扫码轮询的 `uniKey` 和 `803` 等状态是私有设备登录；标准替代是 RFC 8628。
- RSA-SHA256 请求签名值得保留，但它不是 JWS、客户端断言或发送方约束 access token；必须另行定义规范化、algorithm、`kid` 和轮换。
- 签名不能抵消 Secret 进入 URL/日志的风险；敏感凭据位置仍独立扣分。

## 建议网易云音乐按此顺序改进

1. 在现有 OpenAPI 之上提供完整 OAuth 2.0/OIDC 标准端点、Authorization Server Metadata、Discovery、JWKS 和标准 `id_token`。
2. 将二维码登录迁移到 RFC 8628，复用标准 `authorization_pending`、`slow_down`、过期和轮询间隔语义。
3. H5/原生应用统一授权码 + PKCE；`clientSecret` 不再出现在 URL 或通用业务参数。
4. 提供标准 token revocation、刷新令牌轮换和重放检测；高风险设备支持 mTLS 或 DPoP。
5. 把现有 RSA-SHA256 升级为标准 JWS 或 `private_key_jwt`，发布 `kid`、JWKS、签名测试向量和双钥轮换流程。
6. 统一 HTTP 状态码和标准 OAuth 错误；旧 `code/subCode` 作为扩展字段而非唯一错误语义。

## 接入企业当前应做什么

- 始终使用 POST/HTTPS，网关禁止记录 Secret、token、grant code 和完整查询串。
- 私钥存入 KMS/HSM；固定签名规范化测试向量并做时钟同步，保存请求摘要以拒绝窗口内重放。
- 将私有二维码流封装在设备授权适配器中，对内部服务暴露统一的设备授权状态机。
- 令牌只作为网易资源访问凭据；企业账户由自有身份网关映射并签发内部会话。

## 资料

- [网易云音乐开放平台登录文档入口](https://developer.music.163.com/st/developer/document?docId=2bb12a93e71a4be0842243b930c2f33c)
- [本仓库 OpenAPI 登录实现](./netease-music.md)
- [OAuth 2.0 Device Authorization Grant（RFC 8628）](https://datatracker.ietf.org/doc/html/rfc8628)
- [OAuth mTLS（RFC 8705）](https://datatracker.ietf.org/doc/html/rfc8705)

> 核验日期：2026-07-27。非公开合作方材料按当前版本事实评价，不把接口名称推定为标准合规证明。
