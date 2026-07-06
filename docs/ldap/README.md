---
title: LDAP 概述
---

# LDAP 概述

**LDAP**(Lightweight Directory Access Protocol,轻量级目录访问协议)是一个访问和维护**目录服务**的协议,定义在 [RFC 4510–4519](https://datatracker.ietf.org/doc/html/rfc4510) 系列。它常被用作企业的**身份数据源**:用户、组、组织结构、设备等都以层级化的"条目"存放在目录里,应用通过 LDAP 来查询用户、验证密码(bind)、检查组成员关系。

## 目录不是数据库

LDAP 目录是一棵树(DIT,Directory Information Tree),为**读多写少、层级化**的场景优化:

- 数据组织成层级(如 `dc=com → dc=example → ou=people → uid=alice`),而非关系表。
- 读取/搜索非常快,写入与事务能力弱(不是关系型数据库的替代)。
- 强调**标准化的 schema**(objectClass 与属性类型)与跨厂商互操作。

典型实现:OpenLDAP、Microsoft Active Directory(AD)、389 Directory Server、Apache DS、以及云上的目录服务。

## 在认证体系中的位置

- **认证(bind)**:应用把用户输入的 DN + 密码发给目录做 `bind`,成功即证明密码正确——这是最传统的"LDAP 登录"。
- **属性/授权源**:即便用 SAML / OIDC 做前端登录,IdP 背后往往仍以 LDAP/AD 作为用户与组的**权威数据源**,登录后从目录取属性、判断组成员以做授权。
- 与 [SAML](../saml/) / [OIDC](../oidc/) 的关系:后者是"联合登录"协议;LDAP 是"目录访问"协议。企业里常见组合是:Keycloak/ADFS 等 IdP **联邦到 AD/LDAP**,对外再讲 SAML/OIDC。

## 从哪里开始

- 想搞懂 DN、条目、objectClass、搜索作用域?看 [核心概念](./concepts.md)。
- 想看一次 bind + search 到底怎么走?看 [典型流程](./flows.md)。
- 需要过滤器语法、常见属性、结果码速查?看 [参考](./reference.md)。
- 想直接拼一个搜索过滤器?用 [LDAP 过滤器构建器](../tools/ldap-filter.md),并对 [Mock LDAP](../mock/ldap.md) 示例目录试搜。
