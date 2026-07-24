---
title: "国内平台 SSO 对接"
---

# 国内平台 SSO 对接与标准差距

国内的飞书、钉钉、微信、企业微信,以及喜马拉雅车载 SDK 这类平台**都能做登录 / SSO**,但它们和标准协议(SAML / OAuth 2.0 / OIDC)的贴合程度差别很大,踩坑点也和对接 Okta / Entra ID 完全不同。

本区每个平台都拆成**两篇**:一篇讲**怎么落地对接**,一篇**逐项评价它与标准的差距、风险与改造建议**。想快速接入看前者,想评估风险 / 推动对方改造看后者。

## 平台索引

| 平台 | 本质 | 对接实现 | 标准差距评价 |
|---|---|---|---|
| **飞书** | 作 SP 只有 SAML 2.0;作 IdP 才有 OIDC | [对接实现](./feishu.md) | [评价与建议](./feishu-review.md) |
| **钉钉** | 原生无标准 SAML/OIDC,私有 OAuth2 变体 | [对接实现](./dingtalk.md) | [评价与建议](./dingtalk-review.md) |
| **微信**(C 端) | OAuth2 授权码变体,`snsapi_login` | [对接实现](./wechat.md) | [评价与建议](./wechat-review.md) |
| **企业微信** | OAuth2 授权码变体 + 应用级 token 三步取人 | [对接实现](./wecom.md) | [评价与建议](./wecom-review.md) |
| **喜马拉雅车载 SDK** | 私有账户互通(透传 body + 回调) | [对接实现](./ximalaya.md) | [评价与建议](./ximalaya-review.md) |
| **QQ 音乐 SDK** | 私有账号绑定(透传 token + 签名回调) | [对接实现](./qqmusic.md) | [评价与建议](./qqmusic-review.md) |

## 先分清两个方向

"企业 SSO 集成"有两种截然不同的含义,一定要先分清你在做哪一个——同一个平台在两个方向上支持的协议往往**不一样**,这正是最容易被官网"支持 OAuth2/OIDC/SAML"这类笼统措辞误导的地方:

| 方向 | 平台扮演的角色 | 典型诉求 |
|------|--------------|---------|
| **A. 用企业已有账号登录飞书/钉钉** | 平台 = **SP**(服务提供方) | 企业已有 IdP(AD / Okta / IDaaS),想让员工用统一账号登进飞书/钉钉 |
| **B. 用飞书/钉钉/微信账号登录其他系统** | 平台 = **IdP** / 身份源 | 拿平台当登录入口,扫码登进 OA、云桌面等 |

- **微信 / 企业微信扫码登录**属于方向 B(平台作身份源)。
- **飞书 / 钉钉**两个方向都有,且协议不同(见各自对接页)。

## 一句话对照(方向 A:平台作 SP)

| 平台(作 SP) | 原生 SAML | 原生标准 OIDC | metadata 导入 | 现实做法 |
|------|:--------:|:------------:|:----:|---------|
| **飞书** | ✅(旗舰版) | ❌ | ❌ 手工填字段 | 直接配 SAML,注意证书手动轮换([详情](./feishu.md)) |
| **钉钉** | ❌ | ❌(仅私有 OAuth2) | ❌ | 一般靠 IDaaS 桥接;专属版可收 OIDC([详情](./dingtalk.md)) |

## 相关工具与文档

- [飞书 SAML SSO 助手](../tools/feishu-saml.html) —— 解析 IdP metadata / 生成飞书 SP metadata
- [SAML Metadata 解析器](../tools/saml-metadata.html) · [SAML Response 解析器](../tools/saml-parse.html) · [X.509 证书解析](../tools/cert.html) · [PKCE 生成](../tools/pkce.html)
- [SAML 2.0 文档](../saml/) · [OAuth 2.0 文档](../oauth2/) · [OIDC 文档](../oidc/)

## 参考来源

各平台的官方文档链接见各自的对接实现页与评价页末尾的「参考来源 / 参考标准」。
