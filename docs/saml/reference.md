---
title: "典型参数与消息参考"
---

# 典型参数与消息参考

本页是速查表,按消息类型组织。流程上下文见[典型流程](./flows.md),概念解释见[核心概念](./concepts.md)。

## AuthnRequest 关键元素与属性

| 元素/属性 | 必需 | 说明 |
|-----------|------|------|
| `ID` | 是 | 请求唯一标识(NCName,不能以数字开头,惯例加 `_` 前缀)。SP 必须暂存,用于比对 Response 的 `InResponseTo` |
| `Version` | 是 | 固定 `2.0` |
| `IssueInstant` | 是 | 签发时间,UTC ISO 8601(如 `2026-07-03T08:29:55Z`)。IdP 会拒绝偏差过大的请求 |
| `Destination` | 推荐 | IdP SSO 端点 URL。消息经签名时 IdP 必须校验其与实际接收地址一致 |
| `AssertionConsumerServiceURL` | 推荐 | 期望接收 Response 的 SP ACS 地址。IdP 必须核对其在 SP Metadata 登记范围内,否则可被用于窃取 Assertion |
| `ProtocolBinding` | 可选 | 期望 Response 使用的 Binding,一般为 `urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST` |
| `AssertionConsumerServiceIndex` | 可选 | 用索引代替显式 URL(二选一) |
| `ForceAuthn` | 可选 | `true` 时要求 IdP 忽略已有会话、强制重新认证(敏感操作前的 step-up 常用) |
| `IsPassive` | 可选 | `true` 时禁止 IdP 与用户交互;无会话则返回 `NoPassive` 错误(用于静默探测登录态) |
| `<Issuer>` | 是 | SP Entity ID |
| `<NameIDPolicy>` | 可选 | `Format` 声明期望的 NameID 格式;`AllowCreate="true"` 允许 IdP 为新用户建立标识 |
| `<RequestedAuthnContext>` | 可选 | 要求的认证强度,内含一或多个 `<AuthnContextClassRef>`;`Comparison` 取 `exact`/`minimum`/`maximum`/`better` |
| `<Scoping>` / `<ProxyCount>` | 可选 | 代理/中转 IdP 场景,少用 |

## Response 与 Assertion 结构

### Response 外层

| 元素/属性 | 说明 |
|-----------|------|
| `ID` / `Version` / `IssueInstant` | 同上,`ID` 用于日志关联与防重放 |
| `InResponseTo` | 对应 AuthnRequest 的 `ID`。**IdP-initiated 流程中不存在** |
| `Destination` | SP ACS URL,SP 必须校验与自身一致 |
| `<Issuer>` | IdP Entity ID |
| `<samlp:Status>` | 处理结果,见下方 StatusCode 表 |
| `<saml:Assertion>` 或 `<saml:EncryptedAssertion>` | 成功时的断言(0..n 个,Web SSO 下通常恰好 1 个);失败时可无 |

### Status

| 元素 | 说明 |
|------|------|
| `<StatusCode Value="...">` | 顶层状态码(见下表),可嵌套二级 StatusCode 细化原因 |
| `<StatusMessage>` | 人类可读信息,排错时先看它 |
| `<StatusDetail>` | 机器可读的附加细节 |

### Subject 与 SubjectConfirmation(bearer)

| 元素/属性 | 说明 |
|-----------|------|
| `<NameID>` | 主体标识,`Format` 见下文一览表 |
| `<SubjectConfirmation Method>` | Web SSO 固定为 `urn:oasis:names:tc:SAML:2.0:cm:bearer`("持有即证明") |
| `SubjectConfirmationData/@Recipient` | 必须等于接收该 Assertion 的 ACS URL,SP 必须校验 |
| `SubjectConfirmationData/@NotOnOrAfter` | bearer 确认的过期时刻,必须校验;注意 bearer 场景**不含** `NotBefore` |
| `SubjectConfirmationData/@InResponseTo` | 同 Response 外层语义,SP-initiated 时必须匹配 |

### Conditions

| 元素/属性 | 说明 |
|-----------|------|
| `NotBefore` / `NotOnOrAfter` | Assertion 整体有效窗(前闭后开),校验时留 2–3 分钟时钟容差 |
| `<AudienceRestriction>/<Audience>` | 受众,必须包含本 SP 的 **Entity ID**(不是 ACS URL) |
| `<OneTimeUse>` | 出现时 SP 须保证一次性使用 |

### AuthnStatement

| 属性/元素 | 说明 |
|-----------|------|
| `AuthnInstant` | 实际认证发生时刻(可能远早于 Assertion 签发,IdP 会话复用时尤甚) |
| `SessionIndex` | IdP 侧会话索引,SP 应保存,SLO 时回填 |
| `SessionNotOnOrAfter` | IdP 建议的 SP 会话上限,SP 宜遵守 |
| `<AuthnContextClassRef>` | 认证方式,常见:`...ac:classes:PasswordProtectedTransport`(HTTPS 上的密码)、`...ac:classes:Password`、`...ac:classes:TimeSyncToken`、`urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified`。做 MFA 强制时 SP 应校验此值 |

### AttributeStatement

| 属性/元素 | 说明 |
|-----------|------|
| `<Attribute Name>` | 属性名。可能是短名(`mail`)也可能是 URI/OID 风格(`urn:oid:0.9.2342.19200300.100.1.3`、`http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`),对接时以对方实际发送为准 |
| `NameFormat` | `...attrname-format:basic` / `:uri` / `:unspecified` |
| `FriendlyName` | 可读别名,不参与匹配逻辑 |
| `<AttributeValue>` | 可多值(如多个组);注意 `xsi:type` 可能存在 |

## 常见 StatusCode

顶层码(`Value` 前缀均为 `urn:oasis:names:tc:SAML:2.0:status:`):

| 值 | 含义 |
|----|------|
| `Success` | 成功 |
| `Requester` | 请求方(SP)的错——请求非法、参数不被接受 |
| `Responder` | 响应方(IdP)的错——IdP 内部原因无法处理 |
| `VersionMismatch` | 协议版本不匹配 |

常见二级码(嵌套在顶层码之内):

| 值(同前缀) | 含义 |
|----|------|
| `AuthnFailed` | 认证失败(密码错、用户取消等) |
| `InvalidNameIDPolicy` | IdP 无法满足请求的 NameID Format |
| `NoAuthnContext` | 无法满足 RequestedAuthnContext 的强度要求 |
| `NoPassive` | `IsPassive=true` 但用户无会话,需要交互 |
| `RequestDenied` | 对端理解请求但拒绝执行(常见于信任配置不符) |
| `UnknownPrincipal` | 无法识别主体 |
| `UnsupportedBinding` | 不支持请求指定的 Binding |
| `PartialLogout` | SLO 未能通知到所有参与方 |
| `ProxyCountExceeded` | 代理跳数超限 |

## NameID Format 一览

| Format URI | 说明 |
|------------|------|
| `urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified` | 未指定,语义由双方线下约定(兼容性兜底,慎用) |
| `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress` | 邮箱格式 |
| `urn:oasis:names:tc:SAML:1.1:nameid-format:X509SubjectName` | X.509 证书主体名 |
| `urn:oasis:names:tc:SAML:1.1:nameid-format:WindowsDomainQualifiedName` | `DOMAIN\user` 形式 |
| `urn:oasis:names:tc:SAML:2.0:nameid-format:kerberos` | Kerberos principal |
| `urn:oasis:names:tc:SAML:2.0:nameid-format:entity` | 标识 SAML 实体本身(Issuer 元素默认即此) |
| `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent` | 持久化化名:不透明、对单一 SP 稳定、跨 SP 不同,推荐用作账号关联主键 |
| `urn:oasis:names:tc:SAML:2.0:nameid-format:transient` | 临时标识,仅本次会话有效 |

## Binding 参数

### HTTP-Redirect Binding(URL 查询参数)

| 参数 | 说明 |
|------|------|
| `SAMLRequest` / `SAMLResponse` | 消息本体:XML → raw deflate → Base64 → URL 编码(编码细节见[典型流程](./flows.md#redirect-url-的编码方式)) |
| `RelayState` | 不透明状态,≤80 字节,对端必须原样回传 |
| `SigAlg` | 签名算法 URI,如 `http://www.w3.org/2001/04/xmldsig-more#rsa-sha256` |
| `Signature` | 对 `SAMLRequest(或 SAMLResponse)=..&RelayState=..&SigAlg=..` 串(URL 编码形态、固定顺序、仅含实际存在的参数)的签名,Base64 后再 URL 编码 |

### HTTP-POST Binding(表单字段)

| 字段 | 说明 |
|------|------|
| `SAMLRequest` / `SAMLResponse` | XML → Base64(**无 deflate**),经浏览器自动提交表单 POST |
| `RelayState` | 同上 |

POST Binding 下签名是 XML 内嵌的 `<ds:Signature>`,不走独立字段。

## Metadata 关键元素

### 通用

| 元素/属性 | 说明 |
|-----------|------|
| `<EntityDescriptor entityID>` | 根元素;`entityID` 即实体标识 |
| `validUntil` / `cacheDuration` | 元数据有效期/缓存时长,消费方应定期刷新 |
| `<KeyDescriptor use="signing">` | 签名验证证书(内嵌 `<ds:X509Certificate>`);省略 `use` 表示签名/加密两用 |
| `<KeyDescriptor use="encryption">` | 加密公钥证书 |

### IdP 侧(`<IDPSSODescriptor>`)

| 元素/属性 | 说明 |
|-----------|------|
| `protocolSupportEnumeration` | 固定含 `urn:oasis:names:tc:SAML:2.0:protocol` |
| `<SingleSignOnService Binding Location>` | SSO 端点,按 Binding 各一条 |
| `<SingleLogoutService Binding Location>` | SLO 端点 |
| `WantAuthnRequestsSigned` | 是否要求 SP 对 AuthnRequest 签名 |

### SP 侧(`<SPSSODescriptor>`)

| 元素/属性 | 说明 |
|-----------|------|
| `<AssertionConsumerService Binding Location index isDefault>` | ACS 端点,可多条,`index` 供 `AssertionConsumerServiceIndex` 引用 |
| `<SingleLogoutService>` | SP 的 SLO 端点 |
| `AuthnRequestsSigned` | SP 承诺对 AuthnRequest 签名 |
| `WantAssertionsSigned` | SP 要求 Assertion 必须签名 |
| `<NameIDFormat>` | SP 支持/期望的 NameID 格式列表 |

## 排错速查表

| 现象 | 常见原因 |
|------|---------|
| IdP 报无法解析 SAMLRequest | Redirect Binding 编码顺序错(漏 deflate / 带 zlib 头 / URL-safe Base64 / 双重 URL 编码) |
| Signature validation failed | 对端证书已轮换而本地 Metadata 未更新;签名/摘要算法不被接受(如 SHA-1 被禁);Redirect 签名串拼接顺序或 URL 编码形态不对;XML 被中间件改写(格式化、转码) |
| Invalid Destination / Recipient | ACS 或 SSO 端点 URL 不一致:http vs https、端口、尾部斜杠、反向代理改写了 Host |
| Audience 校验失败 | SP Entity ID 配错(常见:把 ACS URL 当 Entity ID 填进 IdP) |
| Response 过期 / not yet valid | 双方时钟偏移;SP 未配置 clock skew 容差;用户在 IdP 登录页停留过久后才提交 |
| InResponseTo 不匹配 | SP 集群未共享请求 ID 存储(A 节点发请求、B 节点收响应);用户回退/刷新导致 ID 已被消费;把 IdP-initiated 响应发到只允许 SP-initiated 的 SP |
| 登录成功但拿不到属性 | IdP 未配置属性释放(Attribute Release)策略;属性名不匹配(短名 vs URI/OID);Assertion 加密而 SP 未解密就取值 |
| 循环重定向(SP↔IdP 反复跳) | SP 会话 Cookie 未种上(SameSite/Secure/域配置错),SP 始终认为未登录 |
| IdP 报 unknown/invalid SP | AuthnRequest 的 Issuer 与 IdP 侧登记的 Entity ID 不一致 |
| SLO 后其他 SP 仍在线 | SLO 链路某一跳失败(看是否返回 `PartialLogout`);SP 未保存 SessionIndex;第三方 Cookie 被浏览器拦截 |
| 只有 IE/某代理下失败 | URL 超长(Redirect Binding 消息过大),改用 POST Binding 发送 AuthnRequest |

::: tip 排错工具
浏览器插件 SAML-tracer(Firefox/Chrome)可直接解码抓到的 SAMLRequest/SAMLResponse;后端排查时先把 Base64 解出来看 XML 原文,再对照本页表格逐项核对,绝大多数问题出在 URL/Entity ID/证书三类配置不一致上。
:::
