---
title: LDAP 目录
---

# Mock LDAP 目录(搜索模拟器)

**服务地址:<https://mock.authn.tech/ldap/>**

::: warning 不是真正的 LDAP 协议服务器
LDAP 是 TCP(389/636)上的 ASN.1/BER 二进制协议,而 Cloudflare Workers **无法监听 TCP**(也无法用 443 的 HTTP 路由改写出 LDAP)。真正能 bind/search 的 LDAP 服务器需要跑在能监听 TCP 的宿主(VM/容器里的 OpenLDAP 等,可选用 Cloudflare Spectrum 透传)。因此这里提供的是一个 **HTTP/JSON 搜索模拟器**:暴露一个固定示例目录,并按 RFC 4515 过滤器求值,用于联调**搜索作用域与过滤器语义**。
:::

## 端点

| 端点 | 说明 |
|------|------|
| `GET /ldap/` | 说明页 |
| `GET /ldap/entries` | 返回整个示例目录(JSON) |
| `GET /ldap/search?base=&scope=&filter=&attributes=` | 按 base(DN)、scope(`base`\|`one`\|`sub`)、RFC 4515 filter 搜索 |

参数:`base`(默认 `dc=example,dc=com`)、`scope`(默认 `sub`)、`filter`(默认 `(objectClass=*)`)、`attributes`(逗号分隔,选填,做属性投影)。CORS 全开。

## 示例目录

`dc=example,dc=com` 下:`ou=people`(用户 alice / bob / carol)与 `ou=groups`(组 admins / developers)。用户含 `uid`、`cn`、`sn`、`mail`、`title`、`departmentNumber`、`employeeType` 等属性。完整内容见 [`/ldap/entries`](https://mock.authn.tech/ldap/entries)。

## 试一下

```bash
# 工程部的所有人
curl "https://mock.authn.tech/ldap/search?base=dc=example,dc=com&scope=sub&filter=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote("(&(objectClass=person)(departmentNumber=eng))"))')"

# 只要 mail 与 uid 两个属性
curl "https://mock.authn.tech/ldap/search?base=ou=people,dc=example,dc=com&filter=(uid=carol)&attributes=mail,uid"
```

不想手写过滤器?用 [LDAP 过滤器构建器](../tools/ldap-filter.md) 可视化拼装并一键对本目录测试。协议本身见 [LDAP 概述](../ldap/README.md)。
