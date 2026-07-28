---
title: "SCIM 2.0 速查"
---

# SCIM 2.0 速查

## 标准端点

| 端点 | 作用 |
|------|------|
| `/ServiceProviderConfig` | 发现 PATCH、Bulk、filter、sort、ETag 和认证能力 |
| `/ResourceTypes` | 发现资源类型、端点、核心 schema 与扩展 |
| `/Schemas` | 发现 schema 与属性特征 |
| `/Users` | User 集合查询与创建 |
| `/Users/{id}` | 单个 User 读取、替换、修改与删除 |
| `/Groups` | Group 集合查询与创建 |
| `/Groups/{id}` | 单个 Group 读取、替换、修改与删除 |
| `/Bulk` | 可选批量操作 |
| `/{ResourceType}/.search` | 用 POST 执行查询 |

Base URL 和版本路径由服务提供方决定，例如 `/scim/v2`；客户端不应自行拼接未公布的根路径。

## Schema URI

| 用途 | URI |
|------|-----|
| User | `urn:ietf:params:scim:schemas:core:2.0:User` |
| Group | `urn:ietf:params:scim:schemas:core:2.0:Group` |
| EnterpriseUser | `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User` |
| ListResponse | `urn:ietf:params:scim:api:messages:2.0:ListResponse` |
| PatchOp | `urn:ietf:params:scim:api:messages:2.0:PatchOp` |
| SearchRequest | `urn:ietf:params:scim:api:messages:2.0:SearchRequest` |
| Error | `urn:ietf:params:scim:api:messages:2.0:Error` |
| BulkRequest / BulkResponse | `urn:ietf:params:scim:api:messages:2.0:BulkRequest` / `BulkResponse` |

## HTTP 与媒体类型

| 操作 | 方法与结果 |
|------|------------|
| 创建 | `POST /Users`，成功 `201 Created` |
| 列表/过滤 | `GET /Users?...`，成功 `200 OK` |
| 读取 | `GET /Users/{id}`，成功 `200 OK` |
| 完整替换 | `PUT /Users/{id}`，成功 `200 OK` |
| 部分修改 | `PATCH /Users/{id}`，成功返回 `200 OK` + 完整资源，或 `204 No Content` + 版本/位置响应头 |
| 删除 | `DELETE /Users/{id}`，成功 `204 No Content` |
| 请求/响应类型 | `application/scim+json` |

## 常见状态与 `scimType`

| HTTP | 常见含义 | 可见 `scimType` 示例 |
|------|----------|----------------------|
| `400` | 请求或过滤器无效、结果过多 | `invalidFilter`、`tooMany`、`invalidSyntax`、`invalidPath`、`invalidValue`、`noTarget` |
| `401` | 未认证或 token 无效 | — |
| `403` | 权限不足 | — |
| `404` | 资源不存在 | — |
| `409` | 唯一性冲突 | `uniqueness` |
| `412` | `If-Match` 版本不匹配 | — |
| `413` | 请求体过大 | — |
| `429` | 请求过多 | — |
| `500` | 服务端错误 | — |

错误响应示例：

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
  "status": "409",
  "scimType": "uniqueness",
  "detail": "userName already exists"
}
```

`status` 在 SCIM 错误对象中是字符串形式的 HTTP 状态码。`detail` 应便于排错但不得泄露其他租户数据或内部栈信息。

## 接入流程

1. 获取客户专属 Base URL 和认证配置；
2. 读取 `/ServiceProviderConfig`、`/ResourceTypes` 和 `/Schemas`；
3. 约定身份真源、属性映射、唯一键和 `externalId`；
4. 先实现 User 查询、创建、PATCH 与 `active=false`；
5. 再实现 Group 与成员 PATCH；
6. 加入分页、过滤、标准错误、ETag 和安全重试；
7. 仅在发现支持后使用 sort、Bulk 等可选能力；
8. 用入职、改名、换部门、组变更、离职、重复请求和并发更新做端到端验收。

## 规范链接

- [RFC 7642：定义、概览、概念与需求](https://www.rfc-editor.org/rfc/rfc7642)
- [RFC 7643：Core Schema](https://www.rfc-editor.org/rfc/rfc7643)
- [RFC 7644：Protocol](https://www.rfc-editor.org/rfc/rfc7644)
- [RFC 9967：SCIM Profile for Security Event Tokens](https://www.rfc-editor.org/rfc/rfc9967)
