---
title: "国内平台 SSO 对接"
---

# 国内平台 SSO 对接(飞书 / 钉钉)

国内的飞书、钉钉、企业微信这类平台**都能做企业 SSO**,但它们和标准协议(SAML / OIDC)的贴合程度差别很大,踩坑点也和对接 Okta / Entra ID 完全不同。本页把这些差异讲清楚。

## 先分清两个方向

"企业 SSO 集成"有两种截然不同的含义,一定要先分清你在做哪一个:

| 方向 | 平台扮演的角色 | 典型诉求 |
|------|--------------|---------|
| **A. 用企业已有账号登录飞书/钉钉** | 平台 = **SP**(服务提供方) | 企业已有 IdP(AD / Okta / IDaaS),想让员工用统一账号登进飞书/钉钉 |
| **B. 用飞书/钉钉账号登录其他系统** | 平台 = **IdP** / 身份源 | 拿飞书/钉钉当登录入口,扫码登进 OA、云桌面等 |

同一个平台在两个方向上支持的协议往往**不一样**,这正是最容易被官网"支持 OAuth2/OIDC/SAML"这类笼统措辞误导的地方。

## 飞书(Feishu)

### 方向 A:飞书作 SP —— 只有 SAML 2.0

在**管理后台 → 企业设置 → SSO 账号登录**里配置"用企业 IdP 登录飞书",实际**只支持 SAML 2.0**(且通常要**旗舰版**才开放)。官方所有示例(Okta、Google Workspace、ADFS、竹云、Authing)清一色是 SAML;该界面**没有** OIDC / OAuth2 / CAS 选项。

::: warning 别被"飞书支持 OIDC/OAuth2"误导
那些说法指的是**方向 B(飞书作 IdP)**或飞书集成平台建应用的能力,不是"登录进飞书"这个 SP 场景。SP 侧就是 SAML 2.0 一种。
:::

### 飞书 SAML 的两个硬骨头

1. **不支持导入 IdP metadata**。飞书不吃 metadata XML,你得把 IdP 的**登录地址(SSO URL)、Issuer/Entity ID、签名证书**逐项手工填进去。其中 Public Certificate 只要**裸 base64**——必须去掉 `-----BEGIN CERTIFICATE-----` / `-----END CERTIFICATE-----` 头尾。
2. **证书写死、需手动轮换**。飞书里存的是证书本体,不是"metadata URL 自动同步"。IdP 一旦轮换签名证书,飞书这边不更新就会突然登录失败。

> 🔧 用 [飞书 SAML SSO 助手](../tools/feishu-saml.md) 可以:把 IdP metadata 一键解析成上面这些要手填的字段(证书已自动去头尾);反向生成飞书的 SP metadata 上传给 IdP。

### 飞书侧提供什么给 IdP

飞书**不给** metadata 文件,而是在 SSO 配置页显示可复制的 **Reply URL / Assertion URL(即 ACS)** 和 SP 标识,让你手动粘到 IdP 那边。若 IdP(如 Okta / Entra ID)支持导入 SP metadata,可用上面的工具把这些参数拼成标准 SP metadata 再上传。

### NameID 与用户匹配

飞书按 SAML 断言里的 **NameID** 匹配到飞书用户,常用 `emailAddress`(邮箱)或登录名。请确保 IdP 断言的 NameID 值与飞书成员的对应字段一致,否则会登录成功但匹配不到人。

### 方向 B:飞书作 IdP —— 才有 OIDC / metadata

反过来,用飞书账号登录别的系统时,飞书集成平台支持更丰富的协议(SAML、OIDC、OAuth2 等),并且**能下载元数据文档**。所以"metadata 下载"这个能力在飞书**作 IdP 时才出现,作 SP 时不出现**——又一个容易混的点。

## 钉钉(DingTalk)

钉钉的情况更"不标准":

- **原生不提供标准 SAML,也不提供标准 OIDC**。钉钉登录是它自己的 OAuth2 变体(`login.dingtalk.com/oauth2/auth` + 私有用户信息接口),字段(`userid` 等)是私有的,需要手动映射成 `sub` / `email` 等标准 claim。
- **专属钉钉(专属版)**才支持接受外部 IdP:走 **OIDC 隐式模式**、勾 `id_token`,靠 `id_token` 里的 `sub` 匹配用户,且仅限 SSO 类型账号。
- 因此**要用标准 SAML/OIDC 对接钉钉,业界普遍加一层 IDaaS 中间件**(阿里云 IDaaS、竹云、宁盾等)桥接:IDaaS 对外暴露标准协议,对内用钉钉私有 OAuth2 对接。

## 一句话对照

| 平台(作 SP) | 原生 SAML | 原生标准 OIDC | metadata 导入 | 现实做法 |
|------|:--------:|:------------:|:----:|---------|
| **飞书** | ✅(旗舰版) | ❌ | ❌ 手工填字段 | 直接配 SAML,注意证书手动轮换 |
| **钉钉** | ❌ | ❌(仅私有 OAuth2) | ❌ | 一般靠 IDaaS 桥接;专属版可收 OIDC |

## 相关工具与文档

- [飞书 SAML SSO 助手](../tools/feishu-saml.md) —— 解析 IdP metadata / 生成飞书 SP metadata
- [SAML Metadata 解析器](../tools/saml-metadata.md) · [SAML Response 解析器](../tools/saml-parse.md) · [X.509 证书解析](../tools/cert.md)
- [SAML 2.0 文档](../saml/) · [OIDC 文档](../oidc/) · [OAuth 2.0 文档](../oauth2/)
