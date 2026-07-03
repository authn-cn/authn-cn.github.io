---
title: 参数与数据结构参考
---

# 参数与数据结构参考

本页为字段级速查。概念解释见 [核心概念](./concepts.md),用法见 [流程](./flows.md)。除特别说明外,二进制字段在浏览器 API 中为 `ArrayBuffer`/`BufferSource`,在 JSON 传输中约定用 **Base64URL(无填充)** 编码。

## PublicKeyCredentialCreationOptions(注册)

传给 `navigator.credentials.create({ publicKey })`。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `rp` | 对象 | 是 | 依赖方信息。`rp.id` 为 rpId(默认当前 origin 的有效域),`rp.name` 为展示名。 |
| `user` | 对象 | 是 | `user.id`(二进制,用户不透明句柄,勿放邮箱等 PII)、`user.name`(登录名)、`user.displayName`(展示名)。 |
| `challenge` | BufferSource | 是 | 一次性随机质询,≥ 16 字节。 |
| `pubKeyCredParams` | 数组 | 是 | RP 可接受的算法,按优先级排列,每项 `{ type: "public-key", alg }`,`alg` 为 COSE 标识(见下表)。 |
| `timeout` | number | 否 | 毫秒,建议 60000。仅为提示,浏览器可忽略。 |
| `excludeCredentials` | 数组 | 否 | 已注册凭证列表,防止在同一认证器重复注册。每项 `{ type, id, transports? }`。 |
| `authenticatorSelection` | 对象 | 否 | 认证器筛选,见下。 |
| `attestation` | string | 否 | `none`(默认/推荐)、`indirect`、`direct`、`enterprise`。 |
| `extensions` | 对象 | 否 | 扩展,如 `credProps`(回报是否创建了 resident key)。 |

### authenticatorSelection 子字段

| 字段 | 取值 | 说明 |
|------|------|------|
| `authenticatorAttachment` | `platform` / `cross-platform` | 限定平台认证器或漫游安全密钥;省略则不限。 |
| `residentKey` | `required` / `preferred` / `discouraged` | 是否创建可发现凭证(Passkey)。`required` 强制驻留。 |
| `requireResidentKey` | boolean | 旧字段,为兼容保留;`true` 等价 `residentKey: "required"`。 |
| `userVerification` | `required` / `preferred` / `discouraged` | 是否要求用户验证(UV)。 |

## PublicKeyCredentialRequestOptions(认证)

传给 `navigator.credentials.get({ publicKey })`。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `challenge` | BufferSource | 是 | 一次性随机质询。 |
| `timeout` | number | 否 | 毫秒,提示性。 |
| `rpId` | string | 否 | 依赖方标识,默认当前 origin 的有效域;须与注册时一致。 |
| `allowCredentials` | 数组 | 否 | 允许使用的凭证列表 `{ type, id, transports? }`;免用户名 Passkey 登录时留空。 |
| `userVerification` | string | 否 | `required` / `preferred` / `discouraged`。 |
| `extensions` | 对象 | 否 | 认证扩展。 |

## clientDataJSON

由**浏览器**生成的 JSON(以 UTF-8 字节返回),页面 JS 无法篡改。

| 字段 | 说明 |
|------|------|
| `type` | 注册为 `"webauthn.create"`,认证为 `"webauthn.get"`。 |
| `challenge` | RP 下发 challenge 的 Base64URL 编码。 |
| `origin` | 发起页面的完整 origin,如 `https://login.example.com`。 |
| `crossOrigin` | 是否在跨域 iframe 中发起,通常 `false`。 |
| `topOrigin` | 仅在 `crossOrigin` 为 `true` 时出现,顶层 origin。 |

示例:

```json
{
  "type": "webauthn.get",
  "challenge": "YXV0aC1jaGFsbGVuZ2UtcmFuZG9t",
  "origin": "https://login.example.com",
  "crossOrigin": false
}
```

## authenticatorData 结构

一段二进制,注册与认证都会返回(注册时封装在 `attestationObject` 内)。字节布局:

| 偏移 | 长度 | 字段 | 说明 |
|------|------|------|------|
| 0 | 32 B | `rpIdHash` | `SHA-256(rpId)`,RP 须核对。 |
| 32 | 1 B | `flags` | 位标志,见下。 |
| 33 | 4 B | `signCount` | 大端 32 位签名计数器。 |
| 37 | 可变 | `attestedCredentialData` | 仅当 `AT` 位为 1(注册时)出现,含 AAGUID(16B)、credentialId 长度(2B)、credentialId、credentialPublicKey(COSE)。 |
| 之后 | 可变 | `extensions` | 仅当 `ED` 位为 1 时出现,CBOR 编码。 |

### flags 位定义

| 位 | 名称 | 含义 |
|----|------|------|
| bit 0 (0x01) | `UP` | User Present,用户在场。 |
| bit 2 (0x04) | `UV` | User Verified,用户已验证(多因素)。 |
| bit 3 (0x08) | `BE` | Backup Eligible,凭证可被备份/同步。 |
| bit 4 (0x10) | `BS` | Backup State,凭证当前已备份/已同步。 |
| bit 6 (0x40) | `AT` | Attested credential data included(注册时置 1)。 |
| bit 7 (0x80) | `ED` | Extension data included。 |

::: tip
`BE`/`BS` 用于区分**同步型 Passkey**(可跨设备)与**设备绑定凭证**。若业务要求凭证不可离开设备,可检查 `BE=0`。
:::

## COSE 算法标识

`pubKeyCredParams[].alg` 使用 COSE Algorithm 值(IANA 注册,均为负数):

| alg | 名称 | 说明 | 建议 |
|-----|------|------|------|
| `-7` | ES256 | ECDSA + P-256 + SHA-256 | 首选,几乎所有认证器支持 |
| `-8` | EdDSA | Ed25519 | 支持则可选,性能好 |
| `-35` | ES384 | ECDSA + P-384 + SHA-384 | 少见 |
| `-36` | ES512 | ECDSA + P-521 + SHA-512 | 少见 |
| `-257` | RS256 | RSASSA-PKCS1-v1_5 + SHA-256 | 兼容旧 TPM/Windows Hello,建议一并提供 |
| `-258` | RS384 | RSASSA-PKCS1-v1_5 + SHA-384 | 罕见 |
| `-259` | RS512 | RSASSA-PKCS1-v1_5 + SHA-512 | 罕见 |
| `-37` | PS256 | RSASSA-PSS + SHA-256 | 部分 TPM |

::: tip
实践中提供 `[-7, -257]` 即可覆盖绝大多数认证器:`-7`(ES256)覆盖现代平台与安全密钥,`-257`(RS256)兼容部分 Windows Hello / TPM 场景。
:::

## 排错速查表

| 现象 / 报错 | 常见原因 | 处理 |
|-------------|----------|------|
| `SecurityError`(create/get) | `rp.id`/`rpId` 不是当前 origin 的有效域;非 HTTPS(localhost 除外) | 修正 rpId 为可注册域;使用 HTTPS |
| `NotAllowedError` | 用户取消、超时,或 origin/权限策略不允许 | 提示重试;检查 `timeout` 与 `Permissions-Policy: publickey-credentials-*` |
| `InvalidStateError`(注册) | 该认证器已注册过(命中 `excludeCredentials`) | 提示"此设备已注册",引导登录 |
| `ConstraintError` | `residentKey: required` 或 UV 要求认证器无法满足 | 放宽为 `preferred`,或更换认证器 |
| 服务端 challenge 不匹配 | challenge 未存/已过期;Base64URL 解码错误 | 服务端存储并绑定会话;确认用 Base64URL |
| 服务端 origin 校验失败 | 允许列表缺该 origin;协议/端口不一致 | 精确配置合法 origin 列表 |
| 验签失败 | 验签数据拼接错误(应为 `authData ‖ SHA-256(clientDataJSON)`);算法与存储不符;ECDSA 签名为 DER 编码需正确解析 | 复核验签流程,优先用成熟库 |
| `signCount` 始终为 0 | 同步型 Passkey / 某些平台认证器 | 视为正常,不据此拒绝 |
| Base64URL 相关乱码 | 与标准 Base64 混用 `+//=` | 统一 Base64URL 无填充编解码 |

相关阅读:[概述](./README.md) · [核心概念](./concepts.md) · [注册与认证流程](./flows.md)。多因素与联合登录见 [../mfa/](../mfa/)、[../oidc/](../oidc/)。
