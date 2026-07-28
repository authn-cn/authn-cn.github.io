---
title: "GraphQL over HTTP 接入"
---

# GraphQL over HTTP 接入

::: info 标准状态
GraphQL 核心规范不绑定传输协议。本文依据正在制定的 **GraphQL over HTTP 工作草案**和官方实现指南；它还不是最终标准。面向外部开放 API 时，应在版本化文档中声明支持的媒体类型、方法、错误与状态码约定。
:::

## 端点与认证

服务通常在单个端点（如 `/graphql`）提供 query 和 mutation。认证应由 HTTP 中间件在 GraphQL 解析和执行前完成，例如：

```http
POST /graphql HTTP/1.1
Authorization: Bearer eyJ...
Content-Type: application/json
Accept: application/graphql-response+json
```

Bearer token 应按 OAuth 2.0 资源服务器要求校验签名或内省结果、`iss`、`aud`、有效期和 scope。用户登录身份应来自经过校验的 OIDC ID Token 或服务端会话，而不是把任意 access token 当登录凭证。

## POST 请求

服务必须支持用 `POST` 承载 query 和 mutation。JSON 请求对象为：

```json
{
  "query": "query User($id: ID!) { user(id: $id) { id displayName } }",
  "operationName": "User",
  "variables": { "id": "u_123" },
  "extensions": {}
}
```

| 字段 | 说明 |
|------|------|
| `query` | GraphQL 文档源文本 |
| `operationName` | 文档含多个操作时用于选择一个操作 |
| `variables` | JSON 对象，提供变量值 |
| `extensions` | 可选扩展数据；具体语义须由双方约定 |

请求 `Content-Type` 使用 `application/json`。缺失或不支持的媒体类型应使用适当的 4xx 响应，而不是猜测请求体。

## GET 请求

服务可以支持 `GET`，但只允许执行 `query`，不得执行 `mutation`。`query`、`operationName`、`variables` 和 `extensions` 通过 URL 查询参数传递。

`GET` 有利于 HTTP/CDN 缓存，但需要同时处理：

- URL 长度限制；
- 查询文本和变量进入浏览器历史、代理或访问日志；
- 按 `Authorization`、租户和变量正确区分缓存；
- 禁止把敏感变量放入 URL。

对一方客户端，可使用经过审核的持久化/可信文档，以短 ID 或摘要标识操作。该机制的具体格式仍取决于实现，不能假定所有 GraphQL 服务互通。

## 响应媒体类型与结构

面向新实现，客户端应接受、服务端应优先返回：

```http
Content-Type: application/graphql-response+json; charset=utf-8
```

兼容旧客户端时可额外支持 `application/json`。响应顶层通常包含：

```json
{
  "data": {
    "user": null
  },
  "errors": [
    {
      "message": "Forbidden",
      "locations": [{ "line": 1, "column": 24 }],
      "path": ["user"],
      "extensions": { "code": "FORBIDDEN" }
    }
  ],
  "extensions": {
    "requestId": "req_123"
  }
}
```

- `data`：执行结果；字段错误发生时可与 `errors` 同时存在；
- `errors`：每项必须有 `message`，可有 `locations`、`path` 和 `extensions`；
- `extensions`：实现扩展，不应承载客户端必须依赖却未文档化的核心语义。

如果错误发生在执行开始前（例如语法或校验错误），响应不应包含 `data`。生产环境应隐藏栈、SQL、内部服务地址和未经授权的对象信息。

## HTTP 状态码

HTTP 状态码描述传输和请求处理结果，GraphQL 字段结果由响应体表达：

| 情况 | 推荐处理 |
|------|----------|
| 缺少/无效认证 | `401`，并按 HTTP 认证规范返回挑战信息 |
| 已认证但端点整体禁止访问 | `403` |
| 不支持的媒体类型 | `415` |
| 不接受服务端响应类型 | `406` |
| 用 GET 执行 mutation | `405` |
| JSON、GraphQL 语法或文档校验失败 | 对 `application/graphql-response+json` 使用适当 4xx |
| 已执行且有非 null `data`，部分字段失败 | `2xx`，同时返回 `data` 与 `errors` |
| 服务无法执行有效请求 | 对新媒体类型使用适当 4xx/5xx |

旧实现使用 `application/json` 时可能把部分请求错误也返回为 2xx。客户端必须同时检查媒体类型、HTTP 状态和 GraphQL 响应体。

## 分页

GraphQL 核心不规定分页。外部 API 应选择并稳定公开一种模型：

- 简单 offset/limit：容易实现，但并发插入或删除时容易重复或漏项；
- opaque cursor：更适合持续变化的数据集；
- Relay Cursor Connections：采用 `edges`、`node`、`cursor` 与 `pageInfo` 的独立规范。

无论采用哪种模型，都应设置默认页大小、最大页大小、稳定排序和总查询成本上限。游标对客户端必须是不透明值，并做完整性保护或服务端映射。

