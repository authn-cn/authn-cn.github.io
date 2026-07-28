---
title: "GraphQL 速查"
---

# GraphQL 速查

## 常用语法

```graphql
query Users($first: Int!, $after: String) {
  users(first: $first, after: $after) {
    edges {
      cursor
      node {
        id
        displayName
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}

mutation DisableUser($id: ID!) {
  disableUser(id: $id) {
    id
    status
  }
}
```

## HTTP 速查

| 项目 | 值 |
|------|----|
| 常见端点 | `/graphql` |
| POST 请求类型 | `application/json` |
| 推荐响应类型 | `application/graphql-response+json` |
| POST body | `query`、可选 `operationName`、`variables`、`extensions` |
| GET | 仅 query；服务端可不支持 |
| mutation | 使用 POST |
| 成功或部分成功 | 检查 `data` 和 `errors`，不能只看 HTTP 2xx |

## 错误对象

| 字段 | 要求 |
|------|------|
| `message` | 必须；面向客户端的错误说明 |
| `locations` | 可选；文档中的行列位置 |
| `path` | 可选；执行错误对应的响应字段路径 |
| `extensions` | 可选；可放稳定错误码、请求 ID 等扩展 |

错误码可在 `extensions.code` 中建立自有约定，但这不是 GraphQL 核心规范统一枚举。对外 API 应文档化每个代码、是否可重试以及对应 HTTP 状态。

## 不属于核心规范的能力

| 能力 | 处理方式 |
|------|----------|
| 认证 | OIDC/会话或其他认证机制 |
| API 委托授权 | OAuth 2.0 access token |
| 字段/对象权限 | 服务端业务授权策略 |
| 分页 | 自定义或 Cursor Connections 等独立约定 |
| 文件上传 | 独立上传端点或明确的实现约定 |
| subscription 传输 | 明确选用的 WebSocket/SSE 协议及版本 |
| 持久化文档 | 明确客户端与服务端实现协议 |
| 限流/复杂度 | 服务端策略，不由核心规范给出阈值 |

## 规范与资料

- [GraphQL Specification](https://spec.graphql.org/)
- [GraphQL over HTTP 工作草案](https://graphql.github.io/graphql-over-http/draft/)
- [GraphQL 官方 HTTP 指南](https://graphql.org/learn/serving-over-http/)
- [GraphQL 官方安全指南](https://graphql.org/learn/security/)
- [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm)

