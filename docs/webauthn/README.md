---
title: WebAuthn 概述
---

# WebAuthn 概述

## WebAuthn 是什么

**WebAuthn(Web Authentication)** 是 W3C 制定的浏览器标准 API,让 Web 应用可以用**公钥密码学**替代传统口令进行注册与登录。它是 FIDO 联盟 **FIDO2** 项目的组成部分:

- **WebAuthn**:W3C 标准,定义浏览器与 Web 应用(JavaScript)之间的接口,即 `navigator.credentials.create()` 与 `navigator.credentials.get()`。
- **CTAP(Client to Authenticator Protocol)**:FIDO 联盟标准,定义客户端(浏览器/操作系统)与外部 **Authenticator(认证器)** 之间的通信协议(如 USB、NFC、蓝牙连接的安全密钥)。

WebAuthn + CTAP2 合称 **FIDO2**。对 Web 工程师而言,日常打交道的主要是 WebAuthn API,CTAP 由浏览器和操作系统在底层处理。

## 解决什么问题

传统口令存在结构性缺陷:可被钓鱼、可被撞库、可在服务端泄露后被复用。WebAuthn 通过以下设计解决这些问题:

- **无密码 / 多因素认证**:私钥保存在认证器中,永不离开设备;服务端只存公钥,即使数据库泄露也无法登录。
- **抗钓鱼(phishing-resistant)**:凭证与 **origin(来源)** 绑定。为 `bank.com` 注册的凭证无法在 `bank.evil.com` 上使用,浏览器在协议层强制校验,用户无从"被骗着"泄露凭证。
- **抗重放**:每次 ceremony(仪式)使用服务端下发的一次性 **challenge(质询)**,签名结果无法被重放。

::: tip
"抗钓鱼"是 WebAuthn 相对于短信验证码、TOTP 一次性口令的核心优势:后者可以被中间人钓鱼网站实时转发,而 WebAuthn 的 origin 绑定从密码学层面阻断了这种攻击。
:::

## Passkey 是什么

**Passkey(通行密钥)** 是 FIDO 联盟与各大平台厂商为 WebAuthn 凭证起的**消费级品牌名**,技术本质是一种 **discoverable credential(可发现凭证,也叫 resident key 驻留密钥)**,并且通常具备**跨设备同步**能力。

- **可发现**:凭证连同用户信息存储在认证器内,登录时无需先输入用户名——认证器可以直接"发现"并列出可用账户,实现 **username-less(免用户名)** 登录。
- **可同步**:平台(如 Apple iCloud 钥匙串、Google Password Manager、Windows Hello)将 Passkey 在同账号的设备间端到端加密同步,避免"换手机即丢凭证"。

Passkey 与 WebAuthn 的关系:

| 概念 | 定位 |
|------|------|
| WebAuthn | W3C 技术标准与浏览器 API |
| Passkey | 面向用户的产品概念,底层就是 WebAuthn 的可发现凭证 |
| 同步型 Passkey(synced) | 云端同步,可跨设备,便利性高 |
| 设备绑定型(device-bound) | 不出单一设备(如硬件安全密钥),抗攻击性更高 |

::: warning
从代码看,注册同步型 Passkey 与传统 WebAuthn 凭证的 API 调用几乎一致,区别主要在 `authenticatorSelection.residentKey` 等参数。不要假设 Passkey 一定"绑定单台设备",同步型 Passkey 可在多台设备出现。
:::

## 三大角色

1. **Relying Party(RP,依赖方)**:即你的 Web 应用及其服务端。RP 负责生成 challenge、下发选项、验证认证器返回的 attestation/assertion、存储用户公钥。RP 由 **rpId** 标识(通常是有效域名,如 `example.com`)。
2. **Authenticator(认证器)**:持有私钥、执行密码学签名的实体,分两类:
   - **Platform authenticator(平台认证器)**:内置于设备,如 Touch ID / Face ID、Windows Hello、Android 指纹。
   - **Roaming authenticator(漫游认证器)**:可跨设备使用的外部安全密钥,如 YubiKey,经 USB/NFC/BLE 连接。
3. **Client / Browser(客户端 / 浏览器)**:承载 WebAuthn API 的浏览器与操作系统。负责校验 origin、组装 `clientDataJSON`、通过 CTAP 与认证器通信,并在 RP 与认证器之间中转。

数据流概览:

```
RP 服务端  <--HTTPS-->  浏览器(WebAuthn API)  <--CTAP-->  认证器
   |                          |                              |
下发 options            校验 origin/组装数据          生成密钥/签名
验证签名                返回 credential                私钥不出器
```

## 与密码 / TOTP / OIDC 的关系与定位

| 机制 | 类型 | 抗钓鱼 | 服务端泄露风险 | 与 WebAuthn 关系 |
|------|------|--------|----------------|------------------|
| 口令 password | 记忆型共享密钥 | 否 | 高(哈希可被离线爆破) | 被替代 |
| TOTP(如 Google Authenticator) | 时间型一次性口令 | 否(可被实时钓鱼) | 中(种子泄露即失效) | 作为第二因素,可被 WebAuthn 替代或补充 |
| 短信验证码 | 带外一次性口令 | 否 | 中(SIM 劫持) | 可被 WebAuthn 替代 |
| WebAuthn / Passkey | 公钥挑战-应答 | 是 | 低(仅存公钥) | 本章主题 |
| OIDC(OpenID Connect) | 联合身份协议 | 取决于 IdP | — | 互补:WebAuthn 常作为 OIDC **IdP 内部**的认证手段 |

::: tip
WebAuthn 与 OIDC 不是竞争关系。典型架构中,身份提供方(IdP)对内使用 WebAuthn/Passkey 完成用户认证,对外通过 OIDC 向业务应用签发 ID Token。参见 [../oidc/](../oidc/)。多因素认证的整体设计见 [../mfa/](../mfa/)。
:::

## 适用场景

- **无密码登录**:用 Passkey 完全替代口令,配合可发现凭证实现免用户名登录。
- **强第二因素(2FA)**:在口令之外增加抗钓鱼的硬件/平台认证器,替代 TOTP 与短信。
- **高价值操作二次确认**:转账、修改安全设置等敏感操作前要求一次 WebAuthn 认证(step-up)。
- **企业内网 / 零信任**:用漫游安全密钥做设备无关的强认证。

## 本章导航

- [核心概念](./concepts.md) —— 公钥凭证模型、attestation/assertion、challenge、origin 绑定、UV/UP 等术语。
- [注册与认证流程](./flows.md) —— 两个 ceremony 的完整分步、JS/JSON 示例与服务端验证清单。
- [参数与数据结构参考](./reference.md) —— 各 options 字段表、`clientDataJSON`、`authenticatorData` 结构、COSE 算法表与排错速查。
