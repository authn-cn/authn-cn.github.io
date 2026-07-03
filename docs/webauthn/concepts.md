---
title: 核心概念
---

# 核心概念

本页梳理 WebAuthn 中反复出现的术语与模型。建议先读 [概述](./README.md),再看本页,最后对照 [流程](./flows.md) 与 [参考](./reference.md)。

## 公钥凭证模型

WebAuthn 的核心是**非对称密钥对**。每当用户在某个 **Relying Party(RP,依赖方)** 上注册一个账户,认证器就生成**一对全新的密钥**:

- **私钥(private key)**:保存在 **Authenticator(认证器)** 内部的安全硬件中,**永不离开认证器**,RP 和浏览器都拿不到。
- **公钥(public key)**:返回给 RP,由 RP 与用户账户绑定存储。

关键性质:

- **一 RP 一账户一密钥对**:密钥按 `(rpId, 用户账户)` 隔离,不同站点拿到的凭证互不相关,无法用于跨站追踪。
- **登录靠签名**:认证时认证器用私钥对 RP 下发的 challenge 签名,RP 用存储的公钥验签。服务端从不保存任何可用于登录的秘密。

::: tip
这正是 WebAuthn 抗服务端泄露的原因:数据库里只有公钥,泄露后攻击者既无法伪造签名,也无法反推私钥。
:::

## Credential ID 与 credentialPublicKey

注册成功后 RP 需要存储两样东西:

- **Credential ID**:认证器为这对密钥分配的唯一句柄(字节串,常做 Base64URL 编码存储)。认证时 RP 通过 `allowCredentials` 把它回传给认证器,认证器据此定位对应私钥。
- **credentialPublicKey**:用户公钥,采用 **COSE(CBOR Object Signing and Encryption)Key** 格式编码(RFC 8152)。它是一段 CBOR map,包含密钥类型(`kty`)、算法(`alg`,如 -7 表示 ES256)以及曲线/坐标或模数等参数。

RP 服务端通常把公钥解析出来后,以便于验签的形式(如 PEM 或原始 COSE)持久化。

## attestation 与 assertion

这是两个极易混淆但含义完全不同的词:

- **attestation(证明)**:发生在**注册 ceremony**。认证器在返回新公钥的同时,可附带一份"我是什么型号/厂商的认证器"的可验证声明(`attestationObject`),用于让 RP 确认认证器的**来源与可信度**。
- **assertion(断言)**:发生在**认证 ceremony**。认证器对 challenge 的**签名结果**,用于向 RP **证明用户当前持有对应私钥**。

attestation 的格式由 `fmt` 字段标识,常见:

| fmt | 含义 |
|-----|------|
| `none` | 不提供 attestation,认证器来源不可验证。**大多数消费级场景推荐**,隐私最好。 |
| `packed` | FIDO2 通用格式,可含认证器签名与 X.509 证书链。 |
| `fido-u2f` | 兼容旧版 U2F 安全密钥的格式。 |
| `tpm` | 基于 TPM 的证明。 |
| `apple` | Apple 平台认证器的匿名证明。 |
| `android-key` / `android-safetynet` | Android 平台相关证明。 |

::: warning
只有在企业/高保障场景(需要限定"只接受某厂商的认证器")才需要真正解析并验证 attestation 证书链。多数应用应请求 `attestation: "none"`,避免不必要的隐私暴露与实现复杂度。
:::

## ceremony:registration 与 authentication

WebAuthn 规范用 **ceremony(仪式)** 指代一次完整的、涉及用户、浏览器、认证器、RP 的交互流程,分两种:

1. **Registration ceremony(注册)**:创建新凭证,调用 `navigator.credentials.create()`,产出 attestation。
2. **Authentication ceremony(认证)**:使用已有凭证登录,调用 `navigator.credentials.get()`,产出 assertion。

两者的服务端逻辑对称:都要先下发带 challenge 的 options,再验证认证器的返回。详见 [流程](./flows.md)。

## challenge 与防重放

**challenge(质询)** 是 RP 在每次 ceremony 开始时生成的**加密随机数**(建议 ≥ 16 字节),下发给浏览器,最终被写入 `clientDataJSON` 并纳入认证器的签名范围。

防重放要点:

- challenge 必须**服务端生成、绑定当前会话、一次性使用**,验证后立即作废。
- RP 验证时须比对返回的 challenge 与自己下发的是否**逐字节相等**。
- 不要用可预测值(时间戳、自增 ID)充当 challenge。

## rpId 与来源绑定(origin binding)

抗钓鱼的密码学根基在于两层绑定:

- **rpId**:RP 的标识,必须是当前页面 origin 的**可注册域(registrable domain)或其子域**。例如 origin 为 `https://login.example.com` 时,`rpId` 可为 `login.example.com` 或 `example.com`,但不能是 `example.org`。认证器会对 `rpId` 求 SHA-256 得到 `rpIdHash`,写入 `authenticatorData`,并与凭证绑定。
- **origin**:浏览器把当前页面的完整 origin(如 `https://login.example.com`)写入 `clientDataJSON.origin`,该值由**浏览器**填写,页面 JS 无法伪造。

抗钓鱼原理:钓鱼站 `example.evil.com` 无法把 `rpId` 设成 `example.com`(不满足域匹配),即便诱导用户,认证器也不会返回可用于 `example.com` 的签名;同时 RP 验签时会发现 `clientDataJSON.origin` 不是自己预期的合法 origin 而拒绝。

::: danger
`rpId` 一旦为凭证选定就不可更改。若日后需要跨子域使用,应在注册时就用可注册域(如 `example.com`)而非具体主机名,否则已有凭证将无法在其他子域使用。
:::

## user verification(UV)与 user presence(UP)

认证器在 `authenticatorData.flags` 中报告两个关键位:

- **UP(User Presence,用户在场)**:证明"有人在物理上操作了认证器"(如触碰安全密钥)。几乎所有 ceremony 都要求 UP=1。
- **UV(User Verification,用户验证)**:证明"操作者是账户所有者本人",通过 PIN、指纹、面部等**本地**验证达成。UV=1 意味着这次是**多因素**(持有认证器 + 生物/PIN)。

RP 通过 `userVerification` 参数表达期望:`required`(必须 UV)、`preferred`(尽量 UV)、`discouraged`(不需要,仅 UP)。RP **验签时必须按业务要求核对 flags**,不能只信任请求参数。

## resident key / discoverable credential

- **Non-resident(非驻留)凭证**:私钥不存在认证器可枚举的存储里,认证时必须由 RP 通过 `allowCredentials` 提供 Credential ID 才能使用。适合"先输用户名再认证"的第二因素场景。
- **Resident key / discoverable credential(驻留 / 可发现凭证)**:凭证及用户句柄存在认证器内,可被浏览器直接枚举。支持**免用户名登录**,是 **Passkey** 的技术基础。通过 `authenticatorSelection.residentKey`(`required`/`preferred`/`discouraged`)请求。

## signature counter 防克隆

`authenticatorData` 含一个 **signature counter(签名计数器)** `signCount`,认证器每次签名后单调递增。RP 应存储上次见到的计数值:

- 若新值 **> 旧值**:正常,更新存储。
- 若新值 **≤ 旧值**(且非恒为 0):可能出现了**凭证克隆**,应告警或拒绝。

::: warning
部分平台认证器(尤其是同步型 Passkey)始终返回 `signCount = 0`。此时计数器无意义,RP 不应据此拒绝登录,只需对"从非零跳变为更小非零"这类真正的回退情况做处理。
:::

## attestation 的隐私考量

attestation 证书若在同批次认证器间**唯一**,就会成为跨站可关联的标识,损害用户隐私。为此:

- FIDO 规范要求 attestation 证书至少覆盖 100k 台设备(批次证明,batch attestation),避免单机可识别。
- 平台认证器多采用匿名化 attestation(如 Apple 的匿名 CA、Android 的 anonymization CA)。
- 除非确有企业合规需求,RP 应请求 `attestation: "none"`,让浏览器不传或剥离可识别信息。

下一步:进入 [注册与认证流程](./flows.md) 查看完整 ceremony 与代码示例。
