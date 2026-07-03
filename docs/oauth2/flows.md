---
title: "典型流程"
---

# 典型流程

本页覆盖现代 OAuth 2.0 部署中实际使用的授权流程(Grant Type),以及两个已废弃但仍常被问起的流程。基础概念(角色、PKCE、state 等)见[核心概念](./concepts.md),参数细节见[参考页](./reference.md)。

## Authorization Code Flow(授权码模式,含 PKCE)

**适用**:一切有用户参与的场景——Web 应用、SPA、移动 App、桌面应用。这是 OAuth 2.1 中唯一保留的用户授权模式,且**必须配合 PKCE**。

### 分步流程

1. 客户端生成 `code_verifier`,计算 `code_challenge`(S256),生成随机 `state`,并把二者与用户会话绑定保存;
2. 客户端把用户浏览器重定向到 AS 的授权端点:

```http
GET /authorize?response_type=code
    &client_id=s6BhdRkqt3
    &redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
    &scope=calendar.read%20profile
    &state=af0ifjsldkj
    &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
    &code_challenge_method=S256 HTTP/1.1
Host: as.example.com
```

3. 用户在 AS 上登录(如果尚未登录)并确认授权范围;
4. AS 生成一次性、短有效期(建议 ≤60 秒)的授权码(Authorization Code),重定向回客户端:

```http
HTTP/1.1 302 Found
Location: https://app.example.com/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj
```

5. 客户端**先校验 `state`** 与会话中保存的值一致,然后在后端信道向 token 端点兑换令牌:

```http
POST /token HTTP/1.1
Host: as.example.com
Authorization: Basic czZCaGRSa3F0Mzo3RmpmcDBaQnIxS3REUmJuZlZkbUl3
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

(Confidential Client 用 `Authorization: Basic ...` 认证;Public Client 无 secret,改为在 body 中带 `client_id`。)

6. AS 校验授权码、redirect_uri 一致性、PKCE verifier,通过后返回令牌:

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

7. 客户端携带 Access Token 访问 Resource Server:

```http
GET /v1/calendar/events HTTP/1.1
Host: api.example.com
Authorization: Bearer 2YotnFZFEjr1zCsicMWpAA
```

::: tip 为什么要"码换令牌"两步走
授权码经过用户浏览器(前端信道),暴露面大但只是一次性中间凭证;真正的令牌通过服务器间的后端信道传输,且兑换时需要客户端认证/PKCE 证明。这就是授权码模式比 Implicit 安全的根本原因。
:::

### 常见坑

- **授权码只能用一次**:重复兑换必须失败,且 AS 应撤销已用该 code 签发的令牌(防拦截重放)。客户端侧若出现"偶发 invalid_grant",常见原因是回调被重复触发(浏览器刷新、前端重复渲染)导致二次兑换;
- **redirect_uri 三处一致**:注册值、授权请求值、token 请求值必须完全相同,差一个斜杠或查询参数都会失败;
- **state 校验不能省**:很多 SDK 默认帮你做了,自研实现时最容易漏;
- **授权码不要入日志**:回调 URL 常被访问日志、APM 全量记录,需脱敏;
- SPA 场景令牌不要放 `localStorage`(XSS 可读),优先考虑 BFF(Backend for Frontend)模式或内存 + 静默续期。

## Client Credentials Flow(客户端凭据模式)

**适用**:机器对机器(M2M)——定时任务、微服务间调用、后台服务访问 API。**没有用户参与**,客户端以自己的身份获取令牌,因此没有 Refresh Token(直接重新请求即可)。

### 分步流程

1. 客户端(必须是 Confidential Client)直接请求 token 端点:

```http
POST /token HTTP/1.1
Host: as.example.com
Authorization: Basic czZCaGRSa3F0Mzo3RmpmcDBaQnIxS3REUmJuZlZkbUl3
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&scope=inventory.read
```

2. AS 验证客户端凭据,返回令牌:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "inventory.read"
}
```

### 常见坑

- **在客户端缓存 token 直到临近过期**,不要每次 API 调用前都去申请新 token(会把 AS 打挂,也拖慢自己);
- 该流程下 token 代表的是**客户端本身**而非任何用户,RS 端的权限模型要区分"服务身份"与"用户身份";
- 高安全场景用 `private_key_jwt` 或 mTLS 替代共享 secret;
- 不要把 client_secret 提交进代码仓库——用密钥管理服务注入。

## Device Authorization Flow(设备授权模式)

**适用**:无浏览器或输入困难的设备——智能电视、机顶盒、CLI 工具、IoT。核心思路:**让用户换一台设备(手机/电脑)完成授权**。RFC 8628 定义。

### 分步流程

1. 设备请求 AS 的设备授权端点:

```http
POST /device_authorization HTTP/1.1
Host: as.example.com
Content-Type: application/x-www-form-urlencoded

client_id=1406020730&scope=profile
```

2. AS 返回设备码与用户码:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "device_code": "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS",
  "user_code": "WDJB-MJHT",
  "verification_uri": "https://as.example.com/device",
  "verification_uri_complete": "https://as.example.com/device?user_code=WDJB-MJHT",
  "expires_in": 1800,
  "interval": 5
}
```

3. 设备在屏幕上显示:"请在手机上访问 `as.example.com/device` 并输入代码 **WDJB-MJHT**"(或展示 `verification_uri_complete` 的二维码);
4. 用户在手机浏览器完成登录与授权;
5. 与此同时,设备按 `interval` 秒的间隔轮询 token 端点:

```http
POST /token HTTP/1.1
Host: as.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code
&device_code=GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS
&client_id=1406020730
```

6. 用户尚未完成授权时,AS 返回 `{"error": "authorization_pending"}`;若返回 `slow_down`,轮询间隔需加 5 秒;用户完成授权后,返回正常的 token 响应。

### 常见坑

- 必须处理 `authorization_pending` / `slow_down` / `expired_token` / `access_denied` 四种轮询结果,`slow_down` 不减速会被 AS 限流;
- `user_code` 要用避免歧义的字符集(去掉 0/O、1/I)并分段显示;
- 警惕**授权钓鱼**:攻击者可发起设备流并诱骗用户输入 user_code,AS 的授权页应清晰展示客户端信息与操作后果。

## Refresh Token 流程

**适用**:Access Token 过期后静默续期,避免用户反复登录。

### 分步流程

1. 客户端检测到 Access Token 过期(或收到 RS 的 `401` + `error="invalid_token"`),向 token 端点发起刷新:

```http
POST /token HTTP/1.1
Host: as.example.com
Authorization: Basic czZCaGRSa3F0Mzo3RmpmcDBaQnIxS3REUmJuZlZkbUl3
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token=tGzv3JOkF0XG5Qx2TlKWIA
```

2. AS 返回新的 Access Token,并(在启用 rotation 时)返回**新的 Refresh Token**:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "access_token": "kJ9x2wLmN8pQr4sTuv6yZa",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "8xLOxBtZp8dNvzXbGh4T2q",
  "scope": "calendar.read profile"
}
```

3. 客户端**立即用新 Refresh Token 覆盖旧值**。

### Refresh Token Rotation(轮换)

RFC 9700 要求 Public Client 的 Refresh Token 必须满足以下之一:发送方约束(如 mTLS 绑定)或**轮换**。轮换机制:

- 每次刷新签发新 Refresh Token,旧的立即作废;
- 若 AS 检测到**已作废的 Refresh Token 被再次使用**,判定为令牌泄漏,撤销该授权下的整个令牌族(所有后代 token),迫使重新授权;
- 客户端要做好并发防护:多个标签页/请求同时刷新会触发误判,常用方案是刷新加锁(单飞)+ 对旧 token 保留一个很短的宽限期(部分 AS 支持)。

### 常见坑

- 刷新失败(`invalid_grant`)意味着 Refresh Token 已过期/被撤销/被轮换掉,**唯一正确的处理是引导用户重新走授权码流程**,不要死循环重试;
- 刷新时可以传 `scope` 参数缩减权限,但不能扩权;
- Refresh Token 是高价值凭证:服务端加密存储,移动端放系统钥匙串(Keychain/Keystore),**永远不要发给 Resource Server**。

## 已废弃的流程

::: danger Implicit Flow(隐式模式,`response_type=token`)——已废弃
曾用于 SPA:令牌直接在授权端点的重定向 URL fragment 中返回,跳过授权码兑换。废弃原因:

- Access Token 暴露在 URL 中——进浏览器历史、可能被 Referer 头带出、被恶意脚本读取;
- 没有客户端认证也没有 PKCE,无法确认取走 token 的是合法客户端;
- token 注入攻击难以防御,且天然不支持 Refresh Token。

**取代方案**:Authorization Code + PKCE。CORS 普及后 SPA 完全可以直接调用 token 端点,当年设计 Implicit 的技术前提已不存在。RFC 9700 明确禁止,OAuth 2.1 已删除。
:::

::: danger Resource Owner Password Credentials(密码模式,`grant_type=password`)——已废弃
客户端直接收集用户的用户名和密码,用它换取令牌。废弃原因:

- 客户端接触到用户明文密码,彻底违背 OAuth 的设计初衷(见[概述](./README.md));
- 训练用户把密码输入任意应用,助长钓鱼;
- 无法支持 MFA、社交登录、SSO、验证码等现代认证手段;
- 没有真正的"用户同意"环节。

**取代方案**:一律使用 Authorization Code + PKCE(第一方应用也不例外——用系统浏览器/内嵌授权页完成登录)。RFC 9700 明确禁止,OAuth 2.1 已删除。
:::

## 流程选型速查

| 场景 | 选用流程 |
|------|----------|
| Web 应用(有后端) | Authorization Code + PKCE(Confidential Client) |
| SPA | Authorization Code + PKCE(Public Client,优先考虑 BFF 模式) |
| 移动 / 桌面应用 | Authorization Code + PKCE(系统浏览器,遵循 RFC 8252) |
| 服务对服务、无用户 | Client Credentials |
| 电视 / CLI / IoT | Device Authorization Flow |
| 令牌续期 | Refresh Token(Public Client 启用 rotation) |

## 下一步

- [典型参数与响应参考](./reference.md):以上所有请求/响应的参数与错误码速查表
