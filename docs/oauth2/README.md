---
title: "OAuth 2.0 概述"
---

# OAuth 2.0 概述

OAuth 2.0 是目前互联网上使用最广泛的**授权(Authorization)框架**,由 [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) 定义。它解决的核心问题是:**如何让第三方应用在不获取用户密码的前提下,访问用户在某个服务上的受保护资源**。

## OAuth 2.0 解决什么问题

设想一个场景:一个日程管理应用希望读取你的 Google 日历。在 OAuth 出现之前,常见做法是让用户把 Google 账号密码直接交给这个应用——这意味着:

- 应用拿到了你的**全部权限**,而不仅仅是读日历;
- 应用必须**明文保存**你的密码;
- 你无法单独撤销这一个应用的访问权,只能改密码,这会使所有应用同时失效;
- 服务方无法区分是你本人在操作,还是第三方应用在操作。

OAuth 2.0 用**令牌(Token)**替代密码:用户在授权服务器(如 Google)上完成登录并明确同意授权范围后,第三方应用获得一个权限受限、可单独撤销、有有效期的 Access Token(访问令牌),凭它访问资源。

::: warning OAuth 是授权,不是认证
这是最常见的概念误区。OAuth 2.0 回答的问题是"**这个应用能不能替用户访问某资源**"(授权,Authorization),而不是"**当前用户是谁**"(认证,Authentication)。

Access Token 本身不携带"用户已登录"的可靠语义——拿到一个 token 不等于证明了用户身份(例如 token 可能是为另一个应用签发后被注入的)。直接把 OAuth 当登录协议用会引入安全漏洞。**需要认证/登录时,应使用在 OAuth 2.0 之上构建的 OpenID Connect(OIDC)**,它通过 ID Token 提供经过密码学保护的身份断言。
:::

## 发展历史

| 时间 | 事件 |
|------|------|
| 2007 | OAuth 1.0 发布。基于请求签名(HMAC-SHA1),对开发者不友好,签名实现极易出错 |
| 2010 | OAuth 1.0a 修复会话固定漏洞,后成为 RFC 5849 |
| 2012 | **OAuth 2.0 发布(RFC 6749 框架 + RFC 6750 Bearer Token)**。放弃请求签名,改为依赖 TLS + Bearer Token,大幅简化实现;代价是安全性更依赖正确的部署实践 |
| 2015 | RFC 7636(PKCE)发布,最初为移动等公共客户端设计,后被推荐用于所有客户端 |
| 2019 至今 | **OAuth 2.1 草案**(draft-ietf-oauth-v2-1)推进中:整合 2.0 + PKCE + 安全最佳实践,**移除 Implicit 与 Password 授权模式**,强制 PKCE 与 redirect_uri 精确匹配 |
| 2025 | RFC 9700(OAuth 2.0 Security Best Current Practice)发布,正式确立现代安全基线 |

OAuth 2.0 是一个**框架**而非单一协议:核心规范刻意留出扩展点(授权类型、令牌格式、客户端认证方式),由后续 RFC 逐步补全。

## 核心 RFC 地图

| RFC | 名称 | 作用 |
|-----|------|------|
| [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) | The OAuth 2.0 Authorization Framework | 核心框架:角色、授权类型、端点、错误码 |
| [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750) | Bearer Token Usage | Access Token 如何在 HTTP 请求中携带 |
| [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636) | PKCE | 授权码交换的密码学证明,防授权码拦截 |
| [RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628) | Device Authorization Grant | 电视、CLI 等输入受限设备的授权流程 |
| [RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009) | Token Revocation | 客户端主动撤销令牌的端点 |
| [RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662) | Token Introspection | 资源服务器查询令牌状态与元信息 |
| [RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414) | Authorization Server Metadata | 授权服务器配置发现(`/.well-known/oauth-authorization-server`) |
| [RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700) | Security Best Current Practice | 现代安全基线:强制 PKCE、废弃 Implicit/Password 等 |

其他常见相关规范:RFC 7519(JWT)、RFC 9068(JWT 格式的 Access Token)、RFC 8705(mTLS 客户端认证)、RFC 9126(PAR,推送式授权请求)。

## 适用场景

- **第三方应用集成**:让外部应用有限度地访问你平台上的用户数据(典型的开放平台 API)。
- **自家产品的前后端分离 / 移动 App**:SPA、移动端通过 Authorization Code + PKCE 获取 API 访问权。
- **微服务 / 机器对机器(M2M)**:服务间调用使用 Client Credentials 模式,无用户参与。
- **输入受限设备**:智能电视、IoT 设备、CLI 工具使用 Device Flow。
- **作为 OIDC 的底座**:单点登录(SSO)、社交登录本质上是 OIDC,构建在 OAuth 2.0 之上。

不适用或需谨慎的场景:纯粹的"用户登录"需求应直接用 OIDC;高度可信的第一方场景也不应回退到已废弃的 Password 模式(见[典型流程](./flows.md))。

## 与 SAML / OIDC 的定位对比

| 维度 | OAuth 2.0 | OIDC | SAML 2.0 |
|------|-----------|------|----------|
| 解决的问题 | **授权**(委托访问 API) | **认证**(用户是谁)+ 授权 | 认证 + 企业 SSO |
| 数据格式 | JSON / 表单编码 | JSON(JWT) | XML |
| 令牌 | Access Token、Refresh Token | 增加 ID Token(JWT) | SAML Assertion |
| 典型场景 | API 访问、开放平台、M2M | 社交登录、移动/SPA 登录、现代 SSO | 传统企业内部 SSO(与老系统集成) |
| 移动端友好度 | 好 | 好 | 差 |
| 发布年代 | 2012 | 2014 | 2005 |

简单记忆:**SAML 是上一代企业 SSO;OAuth 2.0 管 API 授权;OIDC = OAuth 2.0 + 身份层,是现代登录方案的默认选择**。

## 本章导航

- [核心概念](./concepts.md) — 角色、客户端类型、令牌、scope、端点、state 与 PKCE
- [典型流程](./flows.md) — Authorization Code(+PKCE)、Client Credentials、Device Flow、Refresh Token,以及已废弃的流程
- [典型参数与响应参考](./reference.md) — 参数表、错误码表、排错速查

::: tip 阅读建议
初次接触建议按 概念 → 流程 → 参考 的顺序阅读;已有基础的读者可直接把[参考页](./reference.md)当速查手册使用。
:::
