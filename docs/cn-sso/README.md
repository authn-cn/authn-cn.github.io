---
title: "国内平台 SSO 标准化与安全评测"
---

# 国内平台 SSO 标准化与安全评测

本区的目标是推动中国互联网平台和企业软件采用开放、可互操作的身份标准，减少“每家一套授权、签名、用户 ID 和 SDK”的重复建设。

评测重点是平台提供给外部系统的协议：OIDC、OAuth 2.0 Security BCP、SAML 2.0、SCIM 2.0、PKCE、令牌与密钥生命周期、回调防重放和 HTTP/TLS 安全。API 数量、SDK 语言、文档篇幅、市场份额和业务功能覆盖不计分；厂商专用 SDK 能接通私有接口，也不能替代标准协议。

先阅读[统一评价方法](./methodology.md)，再查看各平台的“对接实现”和“标准安全评价”；[横向综合评价](./comparison.md)给出同一技术尺度下的差距和迁移路线。

## 平台索引

| 平台 | 当前外部身份形态 | 对接实现 | 标准安全评价 |
|---|---|---|---|
| **飞书** | SAML 企业登录 + OAuth 式开放平台登录 | [对接实现](./feishu.md) | [评价](./feishu-review.md) |
| **钉钉** | 私有 OAuth 式登录；企业联邦能力按版本核验 | [对接实现](./dingtalk.md) | [评价](./dingtalk-review.md) |
| **企业微信** | 私有授权码、应用 token、成员查询和加密回调 | [对接实现](./wecom.md) | [评价](./wecom-review.md) |
| **微信开放平台** | 网站/App/公众号/小程序四类私有 OAuth 式入口 | [对接实现](./wechat.md) | [评价](./wechat-review.md) |
| **喜马拉雅** | OAuth 式开放平台 + 私有车载账号互通 | [车载账户互通](./ximalaya.md) | [评价](./ximalaya-review.md) |
| **网易云音乐** | 私有 AT/RT、二维码/H5 登录和 RSA 请求签名 | [OpenAPI 登录](./netease-music.md) | [评价](./netease-music-review.md) |
| **QQ 音乐** | 车载 SDK 账号绑定与私有验证回调 | [账号绑定](./qqmusic.md) | [评价](./qqmusic-review.md) |

## 统一判断原则

- 接口名里有 `oauth`、`oidc` 或 `sso`，不代表符合对应标准。
- OAuth access token 用于访问资源，不是身份声明；只有符合 OIDC 的签名 `id_token` 才按身份令牌评价。
- 通讯录 API 能同步员工，不代表支持 SCIM；私有二维码轮询也不等于 OAuth Device Flow。
- 通用标准客户端无需厂商 SDK 即可接入，才算互操作；SDK 只应是可选参考实现。
- 私有协议可以通过补偿控制安全使用，但“能安全接入”和“采用开放标准”必须分开评价。

## 两个登录方向

| 方向 | 平台角色 | 应优先采用的标准 |
|---|---|---|
| 企业已有账号登录平台 | 平台作为 SP/RP | SAML 2.0 或 OIDC，配套 metadata、签名与密钥轮换 |
| 平台账号登录外部系统 | 平台作为 IdP/OP | OIDC；API 授权使用 OAuth 2.0 Security BCP |

若还涉及员工入职、转岗和离职，应另外要求 SCIM 2.0。个人微信和音乐账号属于消费身份，不能替代企业员工身份权威源。

## 快速入口

- [统一协议安全评价方法](./methodology.md)
- [七个平台横向标准化评价](./comparison.md)
- [SAML Metadata 解析器](../tools/saml-metadata.html) · [SAML Response 解析器](../tools/saml-parse.html) · [PKCE 生成](../tools/pkce.html)
- [SAML 2.0](../saml/) · [OAuth 2.0](../oauth2/) · [OpenID Connect](../oidc/)

> 资料核验日期：2026-07-27。评测只衡量公开可验证的协议标准化与安全控制，不对平台整体安全、产品功能或商业价值作排名。
