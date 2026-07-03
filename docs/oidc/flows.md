---
title: "典型流程"
---

# 典型流程

## Authorization Code Flow(授权码流程)

这是 OIDC 最重要、适用面最广的流程(Web 应用、SPA、移动 App 都应使用它,公共客户端配合 PKCE)。与纯 OAuth 2.0 授权码模式的区别只有两点:`scope` 含 `openid`、请求带 `nonce`,以及 token 响应多出 `id_token`。

参与方:End-User(浏览器)、RP(`https://rp.example.org`,client_id 为 `s6BhdRkqt3`)、OP(`https://op.example.com`)。

### 第 1 步:RP 发起认证请求

RP 生成随机的 `state`(防 CSRF)与 `nonce`(绑定 ID Token),存入会话后,将浏览器重定向到 OP 的 authorization endpoint:

```http
GET /authorize?response_type=code
    &client_id=s6BhdRkqt3
    &redirect_uri=https%3A%2F%2Frp.example.org%2Fcallback
    &scope=openid%20profile%20email
    &state=af0ifjsldkj
    &nonce=n-0S6_WzA2Mj
    &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
    &code_challenge_method=S256 HTTP/1.1
Host: op.example.com
```

### 第 2 步:用户在 OP 完成认证与授权

OP 认证用户(密码、MFA、SSO 会话复用等),必要时展示授权确认页。

### 第 3 步:OP 携授权码回调 RP

```http
HTTP/1.1 302 Found
Location: https://rp.example.org/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj
```

RP 首先校验 `state` 与会话中保存的值一致,不一致立即终止。

### 第 4 步:RP 后端用 code 换 token

```http
POST /token HTTP/1.1
Host: op.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic czZCaGRSa3F0Mzo3RmpmcDBaQnIxS3REUmJuZlZkbUl3

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https%3A%2F%2Frp.example.org%2Fcallback
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

响应:

```json
{
  "access_token": "SlAV32hkKG",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "8xLOxBtZp8",
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjQta2V5LTAxIn0.eyJpc3MiOi...(略).signature"
}
```

`id_token` 解码后的 payload:

```json
{
  "iss": "https://op.example.com",
  "sub": "248289761001",
  "aud": "s6BhdRkqt3",
  "exp": 1767226800,
  "iat": 1767223200,
  "auth_time": 1767223180,
  "nonce": "n-0S6_WzA2Mj",
  "amr": ["pwd"]
}
```

### 第 5 步:RP 验证 ID Token

按[核心概念中的校验清单](./concepts.md#rp-必须做的校验清单)执行:验签(JWKS)、`iss`、`aud`、`exp`/`iat`、`nonce`。全部通过后,以 `iss + sub` 为键建立/关联本地会话——**至此登录完成**。

### 第 6 步(可选):调用 UserInfo 获取更多资料

```http
GET /userinfo HTTP/1.1
Host: op.example.com
Authorization: Bearer SlAV32hkKG
```

```json
{
  "sub": "248289761001",
  "name": "张三",
  "email": "zhangsan@example.com",
  "email_verified": true
}
```

::: warning 本流程常见坑
- **nonce 没校验或没绑定会话**:nonce 必须在发起请求前存入服务端会话,回来后比对并作废;只生成不比对等于没有。
- **aud 没校验**:导致别的应用的 ID Token 可以拿来登录你的系统(token 替换攻击)。
- **UserInfo 的 `sub` 未与 ID Token 的 `sub` 比对**:两者不一致时必须丢弃 UserInfo 数据。
- **把 access token 当身份凭证**:身份判断只能基于验证过的 ID Token,access token 只用于调 API。
- **公共客户端(SPA/移动)漏配 PKCE**:授权码可能被拦截重用,必须用 `S256`。
:::

## response_type 与三种 flow

OIDC Core 定义了三种 flow,由 `response_type` 决定,差异在于"token 从哪个通道返回":

| Flow | response_type | 从授权端点返回 | 从 token 端点返回 | 现状 |
|------|---------------|----------------|-------------------|------|
| Authorization Code | `code` | code | id_token + access_token | **推荐,唯一应选项** |
| Implicit | `id_token` 或 `id_token token` | id_token(+ access_token) | — | 已废弃不推荐 |
| Hybrid | `code id_token`、`code token`、`code id_token token` | code + 部分 token | 其余 token | 特殊场景,少用 |

::: warning Implicit Flow 已不推荐
Implicit 把 token 直接放在重定向 URL 的 fragment 中返回,存在泄漏面大(浏览器历史、Referer、日志)、无法配 PKCE、access token 无发送方约束等问题。OAuth 2.0 Security BCP 与 OAuth 2.1 已明确弃用。**历史上 SPA 用 implicit 是因为跨域限制,如今一律改用授权码 + PKCE。** Hybrid 流程仅在需要"先拿 id_token 提前渲染、再换 code"的少数场景使用,且前端拿到的 id_token 同样要完整校验(此时必须校验 `nonce`,`code id_token` 组合还应校验 `c_hash`)。
:::

## Discovery + JWKS 获取流程

RP 启动或首次对接 OP 时的标准动作:

1. 配置唯一输入:issuer,例如 `https://op.example.com`。
2. 拉取元数据:`GET https://op.example.com/.well-known/openid-configuration`。
3. **校验响应中的 `issuer` 字段与第 1 步配置的 issuer 完全一致**(不一致说明配置错误或遭遇 issuer 混淆攻击)。
4. 从文档取出 `authorization_endpoint`、`token_endpoint`、`userinfo_endpoint`、`jwks_uri`、`end_session_endpoint` 等。
5. 拉取并缓存 JWKS:`GET jwks_uri`。
6. 之后每次验签按 `kid` 查缓存;遇到未知 `kid` 时刷新 JWKS 一次(限频),以平滑处理 key rotation。

::: tip
多数客户端库把 2–6 步封装成一行初始化(如 openid-client 的 `Issuer.discover()`)。手动硬编码端点仅在 OP 不支持 Discovery 时使用。
:::

**常见坑**:issuer 末尾斜杠不一致导致 `iss` 校验失败(`https://op.example.com` ≠ `https://op.example.com/`);JWKS 缓存过期策略缺失导致 key rotation 后全站验签失败。

## RP-Initiated Logout 流程

1. 用户在 RP 点击"退出登录",RP 先销毁**自己的**会话(Cookie/服务端 session)。
2. RP 将浏览器重定向到 OP 的 `end_session_endpoint`(来自 Discovery 文档):

```http
GET /logout?id_token_hint=eyJhbGciOi...(登录时保存的 ID Token)
    &post_logout_redirect_uri=https%3A%2F%2Frp.example.org%2Floggedout
    &state=xj2kdi93 HTTP/1.1
Host: op.example.com
```

3. OP 根据 `id_token_hint` 识别用户与客户端,结束 OP 会话(可能展示确认页;若配置了 Front/Back-Channel Logout,此时顺带通知其他 RP)。
4. OP 将浏览器重定向回 `post_logout_redirect_uri`(附带原样的 `state`):

```http
HTTP/1.1 302 Found
Location: https://rp.example.org/loggedout?state=xj2kdi93
```

**常见坑**:

- `post_logout_redirect_uri` 必须提前在 OP 侧登记,否则 OP 会拒绝或停留在自己的登出页。
- 忘记先清 RP 本地会话——用户"退出"后刷新页面发现还在登录态。
- 未传 `id_token_hint` 时,部分 OP 会向用户展示"确认要登出吗"交互页,体验不一致;登录时应把 ID Token(或其引用)存下来供登出用。
- 只清了 RP 会话没跳 OP:用户下次点登录会被 OP 的 SSO 会话静默重新登入,看起来"退不出去"。

---

各参数与错误码的完整定义见[参数与 Claims 参考](./reference.md);ID Token 校验细节见[核心概念](./concepts.md)。
