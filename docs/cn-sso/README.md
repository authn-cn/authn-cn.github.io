---
title: "国内平台 SSO 标准化与安全评测"
---

# 国内平台 SSO 标准化与安全评测

本区希望推动国内互联网平台和企业软件采用开放、可互操作的身份标准，减少“每个平台一套授权、一套签名、一套用户 ID、一套 SDK”的重复建设。

评测只看平台提供给外部系统的协议面：OIDC、OAuth 2.0 Security BCP、SAML 2.0、SCIM 2.0、PKCE、token 与密钥生命周期、回调防重放和 HTTP/TLS 安全。API 数量、SDK 语言、文档篇幅、市场份额和业务功能不计分。

::: tip 范围
标准 IAM/IDaaS 产品本身不在本区采集和排行范围内。评价单位是**具体产品及其外部接入角色**，不是厂家；同一厂家下的不同产品不会合并评分。
:::

先读[统一评价方法](./methodology.md)，再查看每个系统的“接入流程”和“统一评价”。[横向综合评价](./comparison.md)使用同一八维标准展示差距和迁移顺序。

## ToB：企业平台和软件

重点检查企业账号如何登录平台，以及企业外部应用如何取得成员身份、应用/用户 token、通讯录和事件。

| 具体产品 | 外部接入形态 | 接入流程 | 统一评价 |
|---|---|---|---|
| **飞书** | SAML 企业登录 + OAuth 式开放平台登录 | [接入](./feishu.md) | [74.5 / B](./feishu-review.md) |
| **钉钉** | 私有 OAuth 式登录、应用 token 与 Stream | [接入](./dingtalk.md) | [63 / C](./dingtalk-review.md) |
| **企业微信** | 私有授权码、应用 token、成员查询和加密回调 | [接入](./wecom.md) | [55.5 / C](./wecom-review.md) |
| **WPS 365** | 企业 SSO 三端点 + 用户/应用 token + OpenAPI | [接入](./wps.md) | [53.5 / D](./wps-review.md) |
| **华为云 WeLink** | WeCode 免登 code、应用 ticket 与成员 API | [接入](./welink.md) | [55.5 / C](./welink-review.md) |

## ToC：消费者账号和开发者平台

重点检查网站、App 和服务端如何取得用户同意、验证身份、调用 API、刷新/撤销 token 与处理解绑。应用身份服务也在本组按其面向应用用户的接口评价。

| 具体产品 | 外部接入形态 | 接入流程 | 统一评价 |
|---|---|---|---|
| **微信开放平台** | 网站/App/公众号/小程序的多套私有 OAuth 式入口 | [接入](./wechat.md) | [41.5 / D](./wechat-review.md) |
| **QQ 互联** | 网站/移动 OAuth 式授权与应用作用域 OpenID | [接入](./qq-connect.md) | [41 / D](./qq-connect-review.md) |
| **腾讯云 CloudBase** | 消费 OIDC/SAML 身份源 + 应用用户 token API | [接入](./cloudbase.md) | [71 / B](./cloudbase-review.md) |
| **华为账号 Account Kit** | OAuth 2.0/OIDC 授权码、ID token 与多端 SDK | [接入](./huawei-account.md) | [72.5 / B](./huawei-account-review.md) |
| **抖音开放平台** | 授权码、用户/客户端 token 与解除授权回调 | [接入](./douyin.md) | [56.5 / C](./douyin-review.md) |
| **百度账号** | OAuth 式授权、openid/unionid 与用户 API | [接入](./baidu.md) | [37.5 / E](./baidu-review.md) |
| **支付宝开放平台** | 用户授权 + 商户/应用代调用授权 + RSA2/证书 | [接入](./alipay.md) | [56 / C](./alipay-review.md) |
| **微博开放平台** | OAuth2 式授权与用户 API | [接入](./weibo.md) | [40 / D](./weibo-review.md) |
| **Gitee 开放平台** | 用户 OAuth、企业 token 与 Webhook | [接入](./gitee.md) | [47.5 / D](./gitee-review.md) |

## 内容和设备软件

这类产品重点检查车载、电视、音频设备上的账号绑定、二维码登录和回调，是否采用 OAuth Device Authorization Grant 等标准实现。

| 具体产品 | 外部接入形态 | 接入流程 | 统一评价 |
|---|---|---|---|
| **喜马拉雅** | OAuth 式开放平台 + 私有车载账号互通 | [接入](./ximalaya.md) | [55.5 / C](./ximalaya-review.md) |
| **网易云音乐** | 私有 AT/RT、二维码/H5 登录和 RSA 请求签名 | [接入](./netease-music.md) | [50 / D](./netease-music-review.md) |
| **QQ 音乐** | 车载 SDK 账号绑定与私有验证回调 | [接入](./qqmusic.md) | [36.5 / E](./qqmusic-review.md) |

## 不混淆厂家的规则

| 厂家 | 本区分开的具体系统 | 不能互换的典型主体 |
|---|---|---|
| 腾讯 | 企业微信、微信开放平台、QQ 互联、CloudBase、QQ 音乐 | `userid`、微信 `openid/unionid`、QQ `openid`、CloudBase `sub`、音乐账号标识 |
| 华为 | WeLink、华为账号 Account Kit | 企业 `userId` 与消费者 OIDC subject |
| 阿里/蚂蚁相关生态 | 钉钉、支付宝开放平台 | 企业成员标识、支付宝个人用户、商户/应用授权主体 |

厂商归属只用于说明产品边界，不用于合并账号或继承评分。任何跨产品账号关联都必须有公开的作用域规则和用户控制权验证，不能依据“同属一家公司”推导。

## 统一判断原则

- 路径或接口名含 `oauth`、`oidc`、`sso`，不代表符合对应标准。
- OAuth access token 用于访问资源，不是身份声明；只有按 OIDC 验证的 `id_token` 才按身份令牌评价。
- 通讯录 API 不等于 SCIM；私有二维码轮询不等于 OAuth Device Flow。
- 通用标准客户端无需厂商 SDK 即可接入，才算互操作；SDK 只是可选实现。
- 私有协议可以通过补偿控制安全使用，但“可接入”和“采用开放标准”必须分开评价。

## 快速入口

- [统一协议安全评价方法](./methodology.md)
- [17 个具体系统横向综合评价](./comparison.md)
- [SAML Metadata 解析器](../tools/saml-metadata.html) · [PKCE 生成](../tools/pkce.html)
- [SAML 2.0](../saml/) · [OAuth 2.0](../oauth2/) · [OpenID Connect](../oidc/)

> 资料核验日期：2026-07-27。评测只衡量公开可验证的协议标准化与安全控制，不对平台整体安全、产品功能或商业价值作排名。
