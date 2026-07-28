---
title: "SCIM 资源与 Schema"
---

# SCIM 资源与 Schema

## User

User 的核心 schema URI 是：

```text
urn:ietf:params:scim:schemas:core:2.0:User
```

典型资源：

```json
{
  "schemas": [
    "urn:ietf:params:scim:schemas:core:2.0:User",
    "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"
  ],
  "id": "2819c223-7f76-453a-919d-413861904646",
  "externalId": "hr-10086",
  "userName": "zhangsan@example.com",
  "name": {
    "formatted": "张三",
    "familyName": "张",
    "givenName": "三"
  },
  "displayName": "张三",
  "emails": [
    { "value": "zhangsan@example.com", "type": "work", "primary": true }
  ],
  "active": true,
  "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
    "employeeNumber": "10086",
    "department": "研发部",
    "manager": { "value": "manager-resource-id" }
  },
  "meta": {
    "resourceType": "User",
    "version": "W/\"a330bc54f0671c9\"",
    "location": "https://example.com/scim/v2/Users/2819c223"
  }
}
```

`userName` 是 User 的必需标识属性，但“登录名是否等于邮箱”属于服务策略，不应自行假定。姓名、邮箱、电话等多值属性可以带 `type`、`primary` 和 `display` 等子属性。

## Group

Group 的核心 schema URI 是：

```text
urn:ietf:params:scim:schemas:core:2.0:Group
```

`displayName` 是必需属性，`members` 包含成员资源引用：

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
  "displayName": "研发部",
  "members": [
    {
      "value": "2819c223-7f76-453a-919d-413861904646",
      "$ref": "https://example.com/scim/v2/Users/2819c223",
      "type": "User"
    }
  ]
}
```

成员的 `value` 是服务端 SCIM 资源 `id`，不能直接把 HR 员工号或邮箱当作成员 ID。组是否映射为产品角色或资源权限属于产品策略，必须单独文档化。

## `id`、`externalId` 与业务标识

| 属性 | 谁分配 | 作用 |
|------|--------|------|
| `id` | Service Provider | 服务内稳定、不可变、不可重用的资源标识 |
| `externalId` | Client | 客户端供应域中的关联标识，帮助跨系统匹配 |
| `userName` | 通常由 Client 提供 | 服务内用于标识用户，要求和规范特征由 schema 给出 |
| 企业扩展 `employeeNumber` | Client | 业务员工号，不应代替服务端 `id` |

可靠接入通常保存 `externalId ↔ id` 映射。首次供应前使用明确的匹配规则查重，不能只按可变邮箱自动合并账号，更不能跨租户匹配。

## Schema URI 与扩展

每个资源的 `schemas` 数组列出该资源实际使用的 schema URI。标准企业用户扩展为：

```text
urn:ietf:params:scim:schemas:extension:enterprise:2.0:User
```

自定义扩展应使用组织控制的唯一 URI，并通过 `/Schemas` 和 `/ResourceTypes` 公开。不要把自定义字段直接塞到核心 User 顶层，也不要重定义标准属性的类型或语义。

## 属性特征

SCIM schema 会声明属性的关键特征：

| 特征 | 示例含义 |
|------|----------|
| `type` / `multiValued` | 字符串、布尔、复杂类型以及是否多值 |
| `required` | 创建或表示资源时是否必需 |
| `mutability` | `readOnly`、`readWrite`、`immutable` 或 `writeOnly` |
| `returned` | `always`、`never`、`default` 或 `request` |
| `uniqueness` | `none`、`server` 或 `global` |
| `caseExact` | 字符串比较是否区分大小写 |
| `canonicalValues` | 规范建议的常用值集合 |

客户端应根据服务端发现结果适配能力，服务端不能接受后悄悄改变值却不返回可判断的错误。

## 发现端点

一个可互操作的服务应提供：

- `/ServiceProviderConfig`：PATCH、Bulk、filter、sort、认证方式等能力；
- `/ResourceTypes`：资源类型、端点、核心 schema 与扩展；
- `/Schemas`：schema 与属性定义。

客户端不应仅靠厂商页面或试错猜测能力。发现响应也需要认证或最小化公开信息，以免泄露租户自定义 schema 和安全配置。

