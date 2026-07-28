---
title: "SCIM 协议操作"
---

# SCIM 协议操作

以下示例以 `https://example.com/scim/v2` 为 Base URL。SCIM 请求和响应使用：

```http
Content-Type: application/scim+json
Accept: application/scim+json
```

## 创建与读取

创建 User 使用集合端点：

```http
POST /scim/v2/Users
```

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "externalId": "hr-10086",
  "userName": "zhangsan@example.com",
  "displayName": "张三",
  "active": true
}
```

成功创建返回 `201 Created`、完整资源及 `Location`。由服务端生成的 `id`、`meta.location` 和 `meta.version` 不应由客户端伪造。

读取单个资源：

```http
GET /scim/v2/Users/{id}
```

可以用 `attributes` 选择返回属性，或用 `excludedAttributes` 排除属性；两者不应同时使用。

## 查询、过滤与分页

```http
GET /scim/v2/Users?filter=externalId%20eq%20%22hr-10086%22&startIndex=1&count=100
```

常用过滤操作符：

| 类别 | 操作符 |
|------|--------|
| 存在 | `pr` |
| 比较 | `eq`、`ne`、`co`、`sw`、`ew`、`gt`、`ge`、`lt`、`le` |
| 逻辑 | `and`、`or`、`not` |
| 多值属性过滤 | `emails[type eq "work" and value co "@example.com"]` |

列表响应使用 `urn:ietf:params:scim:api:messages:2.0:ListResponse`，其中：

- `totalResults`：匹配总数；
- `startIndex`：当前页的 **1-based** 起始位置；
- `itemsPerPage`：本次实际返回数量；
- `Resources`：资源数组。

客户端不能假定服务端会返回请求的全部 `count`；服务端可施加最大页大小。稳定同步还应指定服务支持的排序方式，并正确处理数据在翻页期间变化。RFC 7644 的基础分页是索引式，不应把 `startIndex` 当不变游标。

查询字符串过长或不适合记录在 URL 时，可按 RFC 7644 使用 `POST /Users/.search`（指定资源类型）或 `POST /.search`（服务根查询），请求体采用 SearchRequest schema。

## PUT 与 PATCH

`PUT /Users/{id}` 是替换操作。未提供的可写属性可能被移除或恢复默认值，因此客户端若只想改少量字段，应优先使用 PATCH。

```http
PATCH /scim/v2/Users/{id}
```

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "replace",
      "path": "displayName",
      "value": "张三丰"
    },
    {
      "op": "add",
      "path": "emails",
      "value": [
        { "value": "zhangsanfeng@example.com", "type": "work", "primary": true }
      ]
    }
  ]
}
```

PATCH 支持 `add`、`remove`、`replace`，操作按数组顺序执行，并作为一个原子请求处理。SCIM PATCH 借鉴 JSON Patch，但路径语法不同，不使用数组下标，也没有 `move`、`copy`、`test`。

修改匹配的多值子属性：

```json
{
  "op": "replace",
  "path": "emails[type eq \"work\"].value",
  "value": "new@example.com"
}
```

## Group 成员

添加成员：

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "add",
      "path": "members",
      "value": [{ "value": "2819c223-7f76-453a-919d-413861904646" }]
    }
  ]
}
```

移除指定成员：

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "remove",
      "path": "members[value eq \"2819c223-7f76-453a-919d-413861904646\"]"
    }
  ]
}
```

服务端应校验被引用资源存在且属于同一租户，避免通过 Group 写入形成越权引用。

## 停用与删除

企业离职回收通常优先：

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    { "op": "replace", "path": "active", "value": false }
  ]
}
```

`active: false` 便于保留审计、历史归属和未来恢复。`DELETE /Users/{id}` 的资源删除语义更强，是否允许及数据保留规则应由服务文档明确。无论采用哪种方式，停用都必须使新会话和后续访问失效；已签发 token、API key 和个人访问令牌的撤销需要与认证系统联动，不能只改数据库状态。

## Bulk

`POST /Bulk` 可在一个请求中提交多个操作，并用 `bulkId` 引用同一批次中新建的资源。Bulk 是可选能力，客户端应先读取 `/ServiceProviderConfig` 的 `bulk.supported`、`maxOperations` 和 `maxPayloadSize`。

不要把 Bulk 当作跨系统事务。客户端仍须逐项检查结果、保存资源 ID、按幂等规则重试失败项，并避免重放已成功创建的操作。
