---
title: "GraphQL 核心概念"
---

# GraphQL 核心概念

## Schema 与类型系统

Schema 是客户端与服务端之间的类型契约。它定义可查询的字段、参数、返回类型以及可执行的根操作。

```graphql
scalar DateTime

type User {
  id: ID!
  displayName: String!
  email: String
  status: UserStatus!
}

enum UserStatus {
  ACTIVE
  DISABLED
}

input UpdateUserInput {
  displayName: String
  status: UserStatus
}

type Query {
  user(id: ID!): User
}

type Mutation {
  updateUser(id: ID!, input: UpdateUserInput!): User!
}
```

常见类型包括：

| 类型 | 用途 |
|------|------|
| Scalar | 叶子值，如 `String`、`Int`、`Float`、`Boolean`、`ID` 和自定义标量 |
| Object | 一组可选择字段 |
| Enum | 有限且命名稳定的取值 |
| Interface / Union | 抽象类型与多态返回值 |
| Input Object | 供参数使用的结构化输入；不能直接复用输出 Object |
| List / Non-Null | `[T]` 表示列表，`T!` 表示不可为 null |

`String!` 只表达 GraphQL 层的非空约束，不代表值可信、已净化或调用者有权访问。

## 操作与选择集

GraphQL 文档可包含三类操作：

- `query`：读取数据；
- `mutation`：产生副作用的写操作；同一 mutation 中的顶层字段按顺序执行；
- `subscription`：建立事件流；核心规范定义执行语义，但不规定 WebSocket 或 SSE 等传输协议。

每个操作都通过选择集声明返回字段。别名可让同一字段用不同参数出现多次，fragment 可复用选择集，directive 可改变执行或类型系统行为。

```graphql
query CompareUsers($a: ID!, $b: ID!) {
  first: user(id: $a) { ...Summary }
  second: user(id: $b) { ...Summary }
}

fragment Summary on User {
  id
  displayName
}
```

## 变量与输入校验

业务值应放在 `variables` 中，不要通过字符串拼接构造 GraphQL 文档：

```json
{
  "query": "query User($id: ID!) { user(id: $id) { id displayName } }",
  "operationName": "User",
  "variables": { "id": "u_123" }
}
```

GraphQL 会依据 schema 校验文档结构和输入类型，但业务层仍须检查长度、范围、格式、HTML/SQL/命令注入风险以及资源归属。

## Resolver 与数据层

Resolver 把字段映射到业务逻辑或数据源。一个请求可能触发大量字段解析，直接逐字段查询数据库会造成 N+1 问题。常见处理方式是：

- 在单个请求作用域内批量加载并缓存相同实体；
- 在数据访问层合并查询；
- 为列表设置分页上限；
- 监控每个字段的耗时、错误和下游调用量。

请求级缓存不能跨用户或租户错误复用；缓存键至少要包含会影响授权结果的身份与租户上下文。

## Null 与错误传播

GraphQL 可在一次响应中同时返回部分 `data` 和 `errors`。字段解析失败时：

- 可空字段通常变为 `null`，其他字段仍可返回；
- 非空字段失败会把 `null` 向上冒泡到最近的可空父字段；
- 如果一直冒泡到根操作，`data` 可能为 `null`。

因此，不应把“HTTP 2xx”或“存在 `data`”等同于所有字段成功。客户端需要同时处理 `data` 与 `errors`，并利用错误中的 `path` 定位失败字段。

## Introspection 与演进

Introspection 通过 `__schema`、`__type` 和 `__typename` 查询 schema。以 `__` 开头的名称由规范保留。它支持文档浏览、IDE 和客户端类型生成。

Schema 演进应优先增加字段并通过 `@deprecated` 标记旧字段，避免直接改名、删除字段、缩窄 nullability 或改变枚举语义。禁用 introspection 只能降低可发现性，不能代替授权和查询控制。

