---
title: "SAML 2.0 概述"
---

# SAML 2.0 概述

## 什么是 SAML

SAML(Security Assertion Markup Language,安全断言标记语言)是一个基于 XML 的开放标准,用于在不同安全域之间交换身份认证(Authentication)与授权(Authorization)数据。它由 OASIS(结构化信息标准促进组织)制定,当前广泛使用的版本是 2005 年 3 月发布的 **SAML 2.0**。

SAML 解决的核心问题是:**用户在 A 系统登录后,如何让 B 系统安全地相信"这个用户已经通过认证",而无需把密码交给 B 系统**。它是企业级单点登录(SSO,Single Sign-On)领域事实上的标准协议,至今仍是大量 SaaS 产品对接企业身份系统的首选方案。

SAML 的基本工作模型:

1. **身份提供者**(IdP,Identity Provider)负责认证用户,并签发一份数字签名的 XML 文档——**断言**(Assertion),声明"某用户在某时刻以某种方式完成了认证,并具有某些属性"。
2. **服务提供者**(SP,Service Provider)接收并验证这份 Assertion(验签名、验有效期、验受众),然后为用户建立本地会话。

由于 Assertion 携带 IdP 的 XML 数字签名,SP 无需与 IdP 实时通信(在最常用的 POST Binding 下)即可离线验证其真实性与完整性,这是 SAML 架构的一个重要特点。

## 历史演进:SAML 1.0 / 1.1 → 2.0

| 版本 | 发布时间 | 说明 |
|------|---------|------|
| SAML 1.0 | 2002 年 11 月 | OASIS 首个版本,奠定 Assertion/Protocol/Binding 基本框架 |
| SAML 1.1 | 2003 年 9 月 | 小幅修订,曾被早期联邦身份部署采用 |
| SAML 2.0 | 2005 年 3 月 | 大版本,**与 1.1 不向后兼容** |

SAML 2.0 融合了三条技术路线:SAML 1.1 本身、Liberty Alliance 的 **ID-FF 1.2**(Identity Federation Framework)以及 Shibboleth 1.3 的实践经验。相对 1.1 的关键改进包括:

- 新增 **SP-initiated SSO** 中标准化的 `<AuthnRequest>` 消息(1.1 只定义了 IdP 侧发起的推送);
- 新增 **单点登出**(SLO,Single Logout)协议;
- 新增 **Metadata** 规范,使 SP 与 IdP 之间的端点、证书等配置可以标准化交换;
- 引入 **NameID Format**(含持久化/临时化名标识)与 NameID 管理协议,支持隐私保护的联邦场景;
- 支持对 Assertion、NameID、Attribute 进行 **XML 加密**。

::: tip
今天新建的集成几乎不会再使用 SAML 1.1。如果遇到只支持 1.1 的老系统,应优先推动升级,两个版本的消息格式与命名空间(`urn:oasis:names:tc:SAML:1.0:*` vs `urn:oasis:names:tc:SAML:2.0:*`)互不兼容。
:::

## OASIS 标准文档组成

SAML 2.0 不是一份文档,而是一组规范。工程上最常查阅的四份核心文档:

| 文档 | 常用简称 | 内容 |
|------|---------|------|
| Assertions and Protocols | **Core**(saml-core-2.0-os) | 定义 Assertion 的结构(三种 Statement)以及请求/响应协议消息(`AuthnRequest`、`Response`、`LogoutRequest` 等)的 XML Schema 与处理规则 |
| Bindings | **Bindings**(saml-bindings-2.0-os) | 定义协议消息如何映射到传输层:HTTP-Redirect、HTTP-POST、HTTP-Artifact、SOAP 等 |
| Profiles | **Profiles**(saml-profiles-2.0-os) | 将 Core + Bindings 组合成可互操作的完整用例,最重要的是 Web Browser SSO Profile 和 Single Logout Profile |
| Metadata | **Metadata**(saml-metadata-2.0-os) | 定义 `EntityDescriptor` 等元数据格式,用于交换实体标识、端点地址、证书 |

四层关系可以概括为:**Core 定义"说什么",Bindings 定义"怎么传",Profiles 定义"完整对话怎么进行",Metadata 定义"双方如何交换配置"**。这些概念在[核心概念](./concepts.md)一页详细展开。

此外还有 Conformance(一致性要求)、Security and Privacy Considerations(安全考量)、Authentication Context(认证上下文)等辅助文档,排错和做安全评审时值得参考。

## 典型适用场景

SAML 2.0 最典型、也几乎是唯一仍在增长的场景是**企业 Web SSO / 身份联邦**:

- **企业内部 SSO**:员工登录一次公司 IdP(如 AD FS、Keycloak、Ping、Okta、Azure AD / Entra ID),即可访问所有内部 Web 应用。
- **企业对接 SaaS**:企业采购 Salesforce、Workday、Jira 等 SaaS 时,通过 SAML 让员工使用公司账号登录,账号生命周期由企业统一管控(常配合 SCIM 做账号同步)。
- **跨组织联邦**:高校联盟(如 eduGAIN/Shibboleth 体系)、政企之间的可信身份互认。

### 与 OAuth 2.0 / OIDC 的定位对比

| 维度 | SAML 2.0 | OAuth 2.0 | OIDC(OpenID Connect) |
|------|----------|-----------|----------------------|
| 解决的问题 | 认证 + 属性传递(SSO) | **授权**(委托访问 API) | 认证(构建在 OAuth 2.0 之上) |
| 报文格式 | XML(签名/加密用 XML-DSig/XML-Enc) | JSON / 表单参数 | JSON,令牌为 JWT |
| 主要凭证 | Assertion | Access Token | ID Token(+ Access Token) |
| 客户端形态 | 传统 Web 应用(浏览器重定向/POST) | Web、移动、SPA、服务间 | Web、移动、SPA |
| 移动端/API 友好度 | 差 | 好 | 好 |
| 企业 SaaS 支持度 | 非常成熟 | —(不用于登录) | 快速普及中 |
| 典型选型 | 对接存量企业 IdP、SaaS 企业版登录 | 开放 API 授权 | 新建系统的 SSO 首选 |

::: tip 选型建议
新建系统优先选 OIDC;但只要你的产品要卖给中大型企业,就大概率绕不开 SAML——大量企业 IdP 与合规流程仍以 SAML 为中心。两者并不互斥,常见做法是用 Keycloak 等中间层做协议桥接(对内 OIDC,对外 SAML)。
:::

## 本章导航

- [核心概念](./concepts.md) —— 角色、Assertion、Protocol、Binding、Profile、Metadata、NameID、签名与加密
- [典型流程](./flows.md) —— SP-initiated SSO、IdP-initiated SSO、Single Logout 的分步流程与完整报文示例
- [典型参数与消息参考](./reference.md) —— AuthnRequest/Response 元素速查表、StatusCode、NameID Format、排错速查
