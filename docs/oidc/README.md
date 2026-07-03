---
title: "OIDC 概述"
---

# OIDC 概述

OpenID Connect(OIDC)是构建在 OAuth 2.0 之上的**身份认证层**(Identity Layer)。一句话概括两者的分工:

> **OAuth 2.0 负责授权(Authorization),OIDC 补上认证(Authentication)。**

OAuth 2.0 解决的问题是"应用 A 如何在用户许可下访问用户在服务 B 上的资源",它的产物是 access token(访问令牌)——一张"资源访问凭证"。但 OAuth 2.0 本身**不回答"当前用户是谁"**这个问题。OIDC 在 OAuth 2.0 的授权流程上叠加了一层标准化的身份声明机制,核心产物是 **ID Token(身份令牌)**——一个由身份提供方签名的 JWT(JSON Web Token,一种自包含的、可验证签名的令牌格式),里面携带"谁、何时、在哪个 IdP、为哪个客户端完成了认证"等信息。

## OIDC 在协议栈中的位置

```
┌─────────────────────────────────────┐
│  OIDC  (认证:用户是谁)             │
├─────────────────────────────────────┤
│  OAuth 2.0  (授权:能访问什么)      │
├─────────────────────────────────────┤
│  HTTP / TLS                         │
└─────────────────────────────────────┘
```

OIDC 复用了 OAuth 2.0 的端点(authorization endpoint、token endpoint)、flow(授权码模式等)和安全机制(state、redirect_uri 校验),仅做了少量扩展:

- 请求授权时在 `scope` 中加入 `openid`,表明"这是一次认证请求";
- token 响应中除 `access_token` 外额外返回 `id_token`;
- 新增 UserInfo Endpoint(用户信息端点)、Discovery(发现机制)等配套设施。

如果你已经熟悉 OAuth 2.0(参见 [OAuth 2.0 文档](../oauth2/)),学习 OIDC 的增量成本非常低。

## 规范族

OIDC 不是单一规范,而是一组规范:

| 规范 | 作用 |
|------|------|
| **OpenID Connect Core 1.0** | 核心规范:定义 ID Token、认证请求/响应、三种 flow、UserInfo Endpoint、标准 Claims |
| **OpenID Connect Discovery 1.0** | 定义 `/.well-known/openid-configuration` 元数据文档,RP 可自动发现 OP 的各端点与能力 |
| **OpenID Connect Dynamic Client Registration 1.0** | 允许客户端通过 API 动态注册,而非人工在控制台创建 |
| **OpenID Connect RP-Initiated Logout 1.0** | RP 主动发起的登出:将用户重定向到 OP 的 `end_session_endpoint` 结束 OP 会话 |
| **OpenID Connect Session Management 1.0** | 基于 iframe 轮询的会话状态监测(RP 感知 OP 端会话变化) |
| **OpenID Connect Front-Channel Logout 1.0** | 前端通道登出:OP 通过浏览器 iframe 逐个通知各 RP 清理会话 |
| **OpenID Connect Back-Channel Logout 1.0** | 后端通道登出:OP 通过服务器间直接调用(携带 Logout Token)通知 RP,不依赖浏览器 |

工程实践中最常用的是 **Core + Discovery + RP-Initiated Logout** 这个组合;单点登出场景再按需引入 Front/Back-Channel Logout(Back-Channel 更可靠,不受浏览器第三方 Cookie 限制影响)。

## 为什么不要用裸 OAuth 2.0 做登录

在 OIDC 标准化之前,很多"第三方登录"是这样实现的:走一遍 OAuth 2.0 拿到 access token,然后调用一个私有的"获取用户信息"接口,把返回的用户 ID 当作登录身份。这种做法存在根本性缺陷:

::: danger access token 不是身份凭证
**access token 的语义是"允许持有者访问某资源",而不是"持有者就是资源属主本人"。**

典型攻击(token substitution / 令牌替换):攻击者在自己的恶意应用 A 上诱导受害者完成 OAuth 授权,拿到受害者的 access token;然后把这个 token 提交给存在此漏洞的应用 B 的登录接口。应用 B 拿 token 调用用户信息接口,查到的是受害者的资料,于是把攻击者的会话登录成了受害者。

问题的根源在于:**access token 里没有受众(audience)信息**,应用 B 无法判断"这个 token 是签发给我的,还是签发给别人的"。
:::

OIDC 的 ID Token 从设计上消除了这类问题:

- `aud` claim 绑定了目标客户端,RP 必须校验 `aud` 是自己的 `client_id`,别家的 token 拿来即被拒绝;
- `iss` claim 标明签发者,配合签名验证可以确认 token 确实来自可信 OP,且未被篡改;
- `nonce` 把 token 与具体一次认证会话绑定,防重放;
- `exp`/`iat`/`auth_time` 提供了时效与认证时间信息。

此外,裸 OAuth2 方案下各家"用户信息接口"的字段五花八门,OIDC 用标准 Claims(`sub`、`name`、`email` 等)统一了这一层,一套 RP 代码可以对接任何合规 OP。

## 适用场景

- **Web 应用 / SPA / 移动 App 的用户登录**:对接企业 IdP(如 Keycloak、Azure AD / Entra ID、Okta)或社交登录(Google、Apple 等)。
- **单点登录(SSO)**:多个应用共享同一 OP 的登录会话,一次登录处处可用。
- **登录 + API 授权一体化**:一次授权码流程同时拿到 ID Token(登录)和 access token(调后端 API),这是 OIDC 相对 SAML 的显著优势。
- **微服务 / 云原生体系的统一身份**:服务网关验证 JWT,身份信息随请求传播。
- **CIAM(客户身份管理)**:面向 C 端海量用户的注册登录体系。

## OIDC 与 SAML 对比

SAML 2.0(Security Assertion Markup Language,基于 XML 的身份联邦协议)是上一代企业 SSO 的事实标准,两者定位相近但气质迥异:

| 维度 | OIDC | SAML 2.0 |
|------|------|----------|
| 数据格式 | JSON / JWT | XML(签名用 XML-DSig,复杂易错) |
| 传输 | REST / HTTP 重定向 | HTTP POST/Redirect Binding,SOAP(Artifact) |
| 令牌 | ID Token(JWT) | SAML Assertion(XML) |
| 移动端 / SPA 支持 | 原生友好 | 差,基本只适合浏览器 Web 应用 |
| API 授权 | 内建(复用 OAuth2 access token) | 无,需另配 OAuth2 |
| 元数据 / 发现 | Discovery 文档(JSON) | SAML Metadata(XML) |
| 生态 | 现代应用、云服务、移动、CIAM | 传统企业内部系统、老牌 SaaS |
| 典型选择 | 新建系统一律优先 | 对接只支持 SAML 的存量系统 |

简单决策:**新项目选 OIDC;只有当对端(通常是老企业软件)只支持 SAML 时才用 SAML**。详见本站 [SAML 文档](../saml/)。

## 本章导航

- [核心概念](./concepts.md) —— OP/RP 角色、ID Token 结构与校验、标准 scope 与 claims、Discovery、JWKS、登出机制
- [典型流程](./flows.md) —— 授权码流程完整分步示例、三种 response_type 对比、Discovery/JWKS 获取、RP-Initiated Logout
- [典型参数与 Claims 参考](./reference.md) —— 认证请求参数、ID Token claims、标准 Claims、prompt 取值、错误码与排错速查

::: tip 前置知识
建议先阅读 [OAuth 2.0 文档](../oauth2/) 掌握授权码模式、PKCE、state 等基础,再进入本章。
:::
