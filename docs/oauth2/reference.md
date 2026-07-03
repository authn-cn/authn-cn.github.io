---
title: "典型参数与响应参考"
---

# 典型参数与响应参考

本页是速查手册,汇总各端点的请求参数、响应字段与错误码。流程上下文见[典型流程](./flows.md),概念解释见[核心概念](./concepts.md)。

## 授权端点请求参数

`GET /authorize`,参数放在查询字符串中(值需 URL 编码):

| 参数 | 必需 | 说明 |
|------|------|------|
| `response_type` | 必需 | 授权码模式固定为 `code`(`token` 即 Implicit,已废弃) |
| `client_id` | 必需 | 客户端注册时获得的标识符 |
| `redirect_uri` | 条件必需 | 回调地址,必须与注册值**逐字符精确匹配**;注册了多个 URI 时必须提供 |
| `scope` | 推荐 | 空格分隔的权限范围列表(URL 编码后空格为 `%20` 或 `+`) |
| `state` | 推荐(实践中应视为必需) | 密码学随机值,回调时原样返回,客户端必须校验,防 CSRF |
| `code_challenge` | 推荐(OAuth 2.1 必需) | PKCE 挑战值:`BASE64URL(SHA256(code_verifier))` |
| `code_challenge_method` | 推荐 | 固定用 `S256`;`plain` 仅为遗留兼容,勿用 |

授权成功回调:`{redirect_uri}?code={授权码}&state={原样返回}`。

## Token 端点请求参数

`POST /token`,`Content-Type: application/x-www-form-urlencoded`。Confidential Client 需附客户端认证(如 `Authorization: Basic ...`);Public Client 在 body 中带 `client_id`。

### grant_type=authorization_code

| 参数 | 必需 | 说明 |
|------|------|------|
| `grant_type` | 必需 | `authorization_code` |
| `code` | 必需 | 授权端点返回的授权码,**一次性** |
| `redirect_uri` | 条件必需 | 授权请求中带了就必须带,且值完全一致 |
| `code_verifier` | PKCE 时必需 | 生成 challenge 所用的原始随机串(43–128 字符) |
| `client_id` | Public Client 必需 | 无客户端认证时用于标识客户端 |

### grant_type=refresh_token

| 参数 | 必需 | 说明 |
|------|------|------|
| `grant_type` | 必需 | `refresh_token` |
| `refresh_token` | 必需 | 之前签发的 Refresh Token |
| `scope` | 可选 | 只能**缩减**,不能超出原授权范围 |

### grant_type=client_credentials

| 参数 | 必需 | 说明 |
|------|------|------|
| `grant_type` | 必需 | `client_credentials` |
| `scope` | 可选 | 申请的权限范围 |

(必须使用客户端认证,仅限 Confidential Client。)

### grant_type=urn:ietf:params:oauth:grant-type:device_code

| 参数 | 必需 | 说明 |
|------|------|------|
| `grant_type` | 必需 | `urn:ietf:params:oauth:grant-type:device_code` |
| `device_code` | 必需 | 设备授权端点返回的 device_code |
| `client_id` | Public Client 必需 | 客户端标识 |

## Token 成功响应字段

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "access_token": "2YotnFZFEjr1zCsicMWpAA",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "tGzv3JOkF0XG5Qx2TlKWIA",
  "scope": "calendar.read profile"
}
```

| 字段 | 必需 | 说明 |
|------|------|------|
| `access_token` | 必需 | 访问令牌,客户端应视为不透明字符串 |
| `token_type` | 必需 | 通常为 `Bearer`;**大小写不敏感**(可能返回 `bearer`),比较时注意 |
| `expires_in` | 推荐 | 有效期秒数;客户端应提前(如 30 秒)视为过期,而不是收到 401 才处理 |
| `refresh_token` | 可选 | 刷新令牌;Client Credentials 模式不签发;启用 rotation 时每次刷新都会返回新值 |
| `scope` | 条件必需 | 实际授予的 scope 与申请不一致时必须返回;客户端应以此为准 |

响应必须带 `Cache-Control: no-store`,防止令牌被缓存。

## 错误响应

### Token 端点错误(RFC 6749 §5.2)

HTTP 状态通常为 `400`(客户端认证失败为 `401`),JSON body:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
Cache-Control: no-store

{
  "error": "invalid_grant",
  "error_description": "Authorization code is expired or already used"
}
```

| 错误码 | 含义 | 常见触发 |
|--------|------|----------|
| `invalid_request` | 请求缺参数、参数重复或格式错误 | 漏了 `grant_type`;body 没用表单编码而是发了 JSON |
| `invalid_client` | 客户端认证失败(HTTP 401) | client_secret 错误/已轮换;认证方式与注册配置不符 |
| `invalid_grant` | 授权凭证无效 | 授权码过期/已使用;redirect_uri 不一致;Refresh Token 被撤销或已轮换;PKCE verifier 校验失败 |
| `unauthorized_client` | 该客户端未被允许使用此 grant_type | 客户端注册时未启用对应授权类型 |
| `unsupported_grant_type` | AS 不支持该 grant_type | 拼写错误;AS 未开启 Device Flow 等扩展 |
| `invalid_scope` | scope 无效、未知或超出范围 | 申请了不存在的 scope;刷新时试图扩权 |

`error_description`(人类可读说明)与 `error_uri`(文档链接)为可选字段,不要在代码逻辑中依赖其内容。

### 授权端点错误(RFC 6749 §4.1.2.1)

错误通过重定向回 `redirect_uri` 返回:`{redirect_uri}?error=access_denied&state=...`。
(但 `client_id` 或 `redirect_uri` 本身无效时,AS **不得重定向**,直接向用户展示错误页。)

| 错误码 | 含义 |
|--------|------|
| `invalid_request` | 请求参数缺失或非法 |
| `unauthorized_client` | 客户端无权使用此 response_type |
| `access_denied` | 用户或 AS 拒绝了授权(用户点了"拒绝") |
| `unsupported_response_type` | 不支持的 response_type |
| `invalid_scope` | 请求的 scope 无效 |
| `server_error` | AS 内部错误(等价 500,但需通过重定向送达) |
| `temporarily_unavailable` | AS 临时过载或维护(等价 503) |

### Device Flow 轮询专用错误(RFC 8628)

| 错误码 | 含义 | 客户端动作 |
|--------|------|-----------|
| `authorization_pending` | 用户尚未完成授权 | 按 `interval` 继续轮询 |
| `slow_down` | 轮询太快 | 间隔 **+5 秒** 后继续 |
| `expired_token` | device_code 已过期 | 重新发起设备授权请求 |
| `access_denied` | 用户拒绝授权 | 终止流程,提示用户 |

## grant_type 一览

| grant_type 值 | 名称 | 状态 | 场景 |
|---------------|------|------|------|
| `authorization_code` | 授权码模式 | **推荐**(须配 PKCE) | 一切有用户参与的场景 |
| `client_credentials` | 客户端凭据模式 | 推荐 | M2M、服务间调用 |
| `refresh_token` | 刷新令牌 | 推荐 | 令牌续期 |
| `urn:ietf:params:oauth:grant-type:device_code` | 设备授权 | 推荐(适用时) | 输入受限设备 |
| `urn:ietf:params:oauth:grant-type:jwt-bearer` | JWT Bearer(RFC 7523) | 特定场景 | 联合身份、服务账号扮演 |
| `urn:ietf:params:oauth:grant-type:token-exchange` | Token Exchange(RFC 8693) | 特定场景 | 微服务间令牌委托/降权 |
| `password` | 密码模式 | **已废弃** | 用 Authorization Code + PKCE 取代 |
| (`response_type=token`) | Implicit(非 grant_type,授权端点直接发令牌) | **已废弃** | 用 Authorization Code + PKCE 取代 |

## Bearer Token 的三种携带方式(RFC 6750)

| 方式 | 示例 | 评价 |
|------|------|------|
| **Authorization 请求头** | `Authorization: Bearer 2YotnFZFEjr1zCsicMWpAA` | **唯一推荐**。不进日志/历史,支持任意 HTTP 方法 |
| 表单 body 参数 | `access_token=2Yotn...`(表单编码 body 中) | 不推荐。仅限无法设置请求头的遗留场景 |
| URL 查询参数 | `GET /api?access_token=2Yotn...` | **禁止使用**。令牌进访问日志、浏览器历史、Referer 头,RFC 6750 本身就不建议,RFC 9700 明确禁止 |

RS 拒绝请求时应返回 `WWW-Authenticate` 头:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="api", error="invalid_token", error_description="The access token expired"
```

| RS 错误码 | HTTP 状态 | 含义 |
|-----------|-----------|------|
| `invalid_request` | 400 | 请求格式错误(如带了两处 token) |
| `invalid_token` | 401 | token 过期、被撤销或无效 → 客户端应刷新或重新授权 |
| `insufficient_scope` | 403 | token 有效但 scope 不足 |

## 排错速查表

| 现象 | 最可能的原因 |
|------|--------------|
| 授权端点直接报错页,没有重定向回来 | `client_id` 不存在,或 `redirect_uri` 与注册值不匹配(检查协议、端口、尾部斜杠、大小写) |
| 回调报 `error=access_denied` | 用户拒绝授权;或 AS 策略拒绝(用户无权限、客户端被禁用) |
| 换 token 报 `invalid_grant` | 授权码已使用(回调被触发两次?)或过期;`redirect_uri` 与授权请求不一致;PKCE verifier 与 challenge 不匹配 |
| 换 token 报 `invalid_client`(401) | secret 错误或已轮换;用了 `client_secret_post` 但 AS 只接受 Basic(或反之);Basic 头未对 id/secret 做 URL 编码 |
| 报 `invalid_request` | body 用了 JSON 而非 `application/x-www-form-urlencoded`;参数重复传递 |
| 刷新报 `invalid_grant` | Refresh Token 过期/被撤销;rotation 场景下用了旧 token(并发刷新未加锁);用户改密码触发全局撤销 |
| RS 返回 401 `invalid_token` | Access Token 过期 → 走刷新;时钟偏移导致 JWT `nbf`/`exp` 校验失败;RS 配置的 issuer/audience 不匹配 |
| RS 返回 403 `insufficient_scope` | 授权时未申请该 scope,或用户未批准;检查 token 响应中实际返回的 `scope` 字段 |
| Device Flow 一直 `authorization_pending` | 用户没完成授权;确认展示的 `verification_uri` 和 `user_code` 正确 |
| 间歇性成功/失败 | 多实例部署的 AS 会话/存储不同步;负载均衡后 redirect 到了不同环境;客户端时钟漂移 |

## 相关页面

- [OAuth 2.0 概述](./README.md)
- [核心概念](./concepts.md)
- [典型流程](./flows.md)
