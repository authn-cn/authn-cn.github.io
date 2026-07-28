---
title: "国内平台 SSO 标准化与安全评价方法"
---

# 国内平台 SSO 标准化与安全评价方法

## 评测目的

本评测希望推动中国互联网平台和企业软件采用可互操作的身份标准，减少“每个平台一套授权、一套签名、一套用户标识、一套 SDK”的重复建设。

评价对象是平台提供给外部系统的登录、授权、令牌、账号供应、回调和相关 API 协议。评分不奖励 API 数量、SDK 语言数量、文档篇幅、市场份额或业务场景覆盖；这些因素可以影响采购，却不能证明协议标准或安全。

本站坚持三条原则：

1. **互操作优先**：通用 OIDC、OAuth、SAML 或 SCIM 实现无需厂商专用 SDK 即可接入，才算采用标准。
2. **安全默认优先**：不能把“接入方可以自行补救”计作平台安全能力；安全控制应由协议和服务端默认提供。
3. **可迁移优先**：标准字段、发现、密钥、错误和生命周期接口应允许替换客户端、网关或身份供应商，而不是被单一厂商 SDK 锁定。

> OAuth 2.0 是授权框架，不等同于身份认证。只有提供符合 OpenID Connect 的 `id_token`、Issuer、Audience、Nonce、Discovery 和密钥验证机制，才把“使用 OAuth 参数的登录”计为 OIDC。

## 评价对象与产品边界

本区评价的单位是**一个具体产品在一个外部接入角色下提供的协议面**，不是厂家、集团或品牌总分。

| 系统角色 | 典型对象 | 本区关注点 |
|---|---|---|
| ToB 企业平台/软件 | 协作办公、企业应用平台 | 企业账号如何登录平台；外部企业应用如何取得成员身份、token、通讯录和事件 |
| ToC 消费者/开发者平台 | 社交账号、支付账号、内容平台、开发者平台、应用身份服务 | 外部网站/App 如何取得用户同意、验证身份、调用 API、刷新/撤销 token 和处理解绑 |
| 内容/设备软件 | 音乐、音频、车载或电视端服务 | 设备授权、二维码登录、账号绑定、SDK 与服务端回调 |

- 同一厂家下的产品必须分开评价。例如企业微信、微信开放平台、QQ 互联和腾讯云 CloudBase 各自成页；WeLink 与华为账号 Account Kit 也各自成页。
- 国际品牌在国内由本地合作方、合资公司或国家云独立运营时，以国内具体实例为评价对象。全球版的协议、账号、端点或功能不能自动为国内版加分，必须提供国内 endpoint、metadata、版本或调用证据。
- 同一产品同时有用户授权、商户授权、应用 token 等角色时，先在接入页拆分流程，再在该产品评价中分别检查主体和凭据边界。
- 标准 IAM/IDaaS 产品本身不在当前采集和排行范围内；OIDC、OAuth、SAML、SCIM 等标准实现仅作为评价参照。
- 一个产品在别的方向支持标准协议，不能替当前方向背书。例如“能消费 OIDC 身份源”不自动证明“能作为完整 OIDC Provider”。

## 统一技术基线

| 领域 | 本评测采用的基线 | 不视为等价实现 |
|---|---|---|
| 用户登录与身份声明 | OpenID Connect Core + Discovery；Web/移动端使用授权码，配合 PKCE、`state`、`nonce` 和精确回调地址 | 只有 `code` 换 `access_token`、再调用私有“取用户”接口 |
| 企业身份联邦 | OIDC 或 SAML 2.0；提供标准 metadata、签名验证和密钥/证书平滑轮换 | 手工填写若干 URL 和证书、无 metadata 的“类 SAML” |
| API 授权 | OAuth 2.0，并遵循 OAuth 2.0 Security BCP；scope、resource/audience 和客户端类型语义清楚 | 把永久 AppSecret 放入 URL，或用自定义 ticket 代替标准授权 |
| 令牌生命周期 | 标准过期、刷新、吊销；需要时提供 introspection；JWT 遵循 JWT BCP | 只能等待令牌自然过期，或把资源令牌当身份令牌 |
| 高保障客户端认证 | `private_key_jwt`、mTLS，或发送方约束令牌（mTLS/DPoP） | 仅靠共享密钥、来源 IP 或 SDK 混淆 |
| 人员与组生命周期 | SCIM 2.0 用户/组模型及协议，或可验证的标准扩展 | 厂商私有通讯录 API 被称作“账号供应标准” |
| 设备登录 | OAuth 2.0 Device Authorization Grant | 自定义二维码轮询状态机但宣称“标准 OAuth” |
| 回调与事件 | TLS；HMAC-SHA-256、JWS/非对称签名或 mTLS；时间戳、nonce/事件 ID、重放窗口和密钥轮换 | MD5/SHA-1 拼接、只有明文 token、只依赖 IP 白名单 |
| HTTP 与传输 | TLS 安全基线；凭据放授权头或请求体；标准状态码、媒体类型和错误语义 | Secret/Token 放查询串、所有结果都返回 HTTP 200 + 私有业务码 |

## 统一评分

每项按 0–5 分，按权重折算为 100 分。所有平台使用同一张表，不因平台规模、产品类型或现有生态调整标准。

| 维度 | 权重 | 5 分要求 |
|---|---:|---|
| 身份联邦与协议互操作 | 20% | OIDC/SAML 标准角色、端点、claims、metadata/discovery 可被通用实现直接使用 |
| 授权流程安全 | 15% | 授权码 + PKCE、`state`/`nonce`、精确回调匹配；不使用 Implicit/ROPC；设备场景采用 RFC 8628 |
| 令牌与客户端凭据安全 | 15% | 明确 token 类型和 audience；刷新轮换/重放检测、吊销或 introspection；支持非对称认证或发送方约束 |
| 权限模型与最小授权 | 15% | 标准 scope/resource 语义，应用与用户权限分离，多租户和敏感资源可最小授权 |
| 密码学与密钥生命周期 | 10% | 现代算法、算法固定与降级防护、JWKS/`kid`、自动轮换、双钥过渡和吊销 |
| 主体标识与账号生命周期 | 10% | 标准 `sub` 作用域明确；支持登出、解绑、注销、停用；企业目录支持 SCIM |
| 回调、事件与防重放 | 10% | 标准签名或 mTLS，覆盖原始消息；时间窗、nonce/事件 ID、幂等、轮换机制完整 |
| API 传输与消息语义 | 5% | TLS、安全的凭据位置、正确 HTTP 方法/状态码、标准错误与内容类型 |

计算公式：

```text
总分 = Σ（单项分 ÷ 5 × 该项权重）
```

### 单项分数含义

| 分数 | 含义 |
|---:|---|
| 5 | 符合公开标准，通用实现可直接互操作，并采用当前安全最佳实践 |
| 4 | 主体符合标准，仅有少量可明确隔离的厂商扩展或高级安全控制缺口 |
| 3 | 采用标准框架但关键部分私有，或安全控制完整但互操作性不足 |
| 2 | 私有协议可工作，需要专用适配器和较多补偿控制 |
| 1 | 使用过时算法、危险凭据传递或缺少关键生命周期/防重放机制 |
| 0 | 未提供该能力，或没有足够证据判断其存在 |

### 综合等级

| 等级 | 总分 | 含义 |
|---|---:|---|
| A | 85–100 | 可作为标准化身份基础设施，默认安全性和可替换性强 |
| B | 70–<85 | 标准采用较好，少量缺口可在明确边界内补齐 |
| C | 55–<70 | 可生产接入，但需要协议网关和明显的补偿控制 |
| D | 40–<55 | 以私有协议为主，迁移、安全验证和长期维护成本高 |
| E | <40 | 高度项目化或存在明显遗留安全设计，不建议作为新系统基线 |

## 评分约束

- 接口名包含 `oauth`、`oidc`、`sso` 不构成合规证据，必须逐项核对规范要求。
- SDK 封装了私有协议，只能降低开发成本，不能提高协议互操作得分。
- 私有协议可以获得“自身安全控制”分，但不能获得对应的“标准采用”分。
- 未公开或合作方材料无法证明的控制按“未验证”处理，不根据厂商规模推定存在。
- 同一平台的消费登录、企业 SSO、开放 API、车载 SDK 分开判断；一种接入方式不能替另一种背书。
- 已被当前安全最佳实践弃用的流程或算法，即使仍能运行，也按新系统标准扣分。

## 面向平台方的统一改进顺序

1. **先提供标准端点**：新增 OIDC Provider、OAuth 2.0 Authorization Server Metadata、JWKS；企业目录提供 SCIM 2.0。
2. **保留兼容层，停止扩展私有协议**：旧客户端经适配网关迁移，新能力只进入标准端点。
3. **升级授权流**：所有公共客户端强制 PKCE；禁用 Implicit 和 ROPC；二维码/电视登录采用 Device Authorization Grant。
4. **升级令牌安全**：补充吊销、刷新令牌轮换和重放检测；高风险接口支持 mTLS 或 DPoP。
5. **统一密钥发布与轮换**：使用非对称签名、`kid` 和 JWKS，支持新旧密钥并行窗口；不再新增 MD5/SHA-1 拼接签名。
6. **标准化主体与生命周期**：明确 `iss + sub`、tenant、client 的作用域；提供登出、注销、停用和解绑事件。
7. **标准化事件安全**：采用 JWS、标准化 Webhook 签名方案或 mTLS，并把 timestamp、nonce、event ID 和算法版本纳入协议。

## 面向接入企业的最低安全门槛

1. 生产选型时要求厂商给出所符合的规范、版本、端点 metadata 和互操作测试结果，不能只接受“兼容 OAuth”的表述。
2. 通用身份网关只接收标准 OIDC/SAML；私有登录放在独立适配器中，由企业自身签发内部会话，禁止把平台 `access_token` 当作 `id_token`。
3. Secret、authorization code、refresh token 不进入客户端、查询串、日志或监控标签；按租户和应用隔离。
4. 严格校验 issuer、audience、签名算法、`kid`、过期时间、`state`、`nonce` 和 PKCE，不接受“解析成功即可信”。
5. 私有回调必须增加短时效票据、HMAC-SHA-256/非对称签名、重放缓存和密钥轮换；无法补齐时不得承载高风险账号操作。
6. 用 `(issuer, subject)` 或明确的平台/租户/应用复合键保存外部身份，不把手机号、邮箱、裸 `openid`/`userid` 当全局主键。

## 规范依据

- [OAuth 2.0 Security Best Current Practice（RFC 9700）](https://datatracker.ietf.org/doc/html/rfc9700)
- [OAuth 2.0 Authorization Server Metadata（RFC 8414）](https://datatracker.ietf.org/doc/html/rfc8414)
- [PKCE（RFC 7636）](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 Token Revocation（RFC 7009）](https://datatracker.ietf.org/doc/html/rfc7009) 与 [Token Introspection（RFC 7662）](https://datatracker.ietf.org/doc/html/rfc7662)
- [OAuth 2.0 for Native Apps（RFC 8252）](https://datatracker.ietf.org/doc/html/rfc8252) 与 [Device Authorization Grant（RFC 8628）](https://datatracker.ietf.org/doc/html/rfc8628)
- [JWT Best Current Practices（RFC 8725）](https://datatracker.ietf.org/doc/html/rfc8725)
- [OAuth mTLS（RFC 8705）](https://datatracker.ietf.org/doc/html/rfc8705) 与 [DPoP（RFC 9449）](https://datatracker.ietf.org/doc/html/rfc9449)
- [OpenID Connect 规范目录](https://openid.net/developers/specs/)
- [SAML 2.0 规范集](https://docs.oasis-open.org/security/saml/v2.0/)
- [SCIM Core Schema（RFC 7643）](https://datatracker.ietf.org/doc/html/rfc7643) 与 [SCIM Protocol（RFC 7644）](https://datatracker.ietf.org/doc/html/rfc7644)
- [TLS/DTLS 安全使用建议（RFC 9325）](https://datatracker.ietf.org/doc/html/rfc9325)

> 评分核验日期：2026-07-28。分数衡量公开可验证的标准采用度与协议安全性，不是对厂商整体安全能力、产品功能或商业价值的评级。
