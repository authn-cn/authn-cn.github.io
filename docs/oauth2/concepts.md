---
title: "核心概念"
---

# 核心概念

本页梳理 OAuth 2.0 的基础构件:角色、客户端、令牌、scope、端点,以及 state 与 PKCE 两个关键安全机制。理解这些概念后,再看[典型流程](./flows.md)会非常顺畅。

## 四种角色

RFC 6749 定义了四个角色:

| 角色 | 说明 | 例子 |
|------|------|------|
| **Resource Owner(资源所有者)** | 能授予资源访问权的实体,通常是最终用户 | 使用日程应用的你 |
| **Client(客户端)** | 代表 Resource Owner 请求访问受保护资源的应用 | 日程管理 App |
| **Authorization Server(授权服务器,AS)** | 认证 Resource Owner、征得同意后签发令牌的服务器 | Google 账号服务、Keycloak、Auth0 |
| **Resource Server(资源服务器,RS)** | 托管受保护资源、验证 Access Token 后提供服务的服务器 | Google Calendar API |

::: tip
Authorization Server 和 Resource Server 可以是同一个系统(小型部署常见),也可以完全分离(一个 AS 保护多个 API)。"Client" 指的是**应用程序**,不是"客户端设备"或"用户"。
:::

## Client 类型与客户端认证

### Confidential vs Public

| 类型 | 定义 | 典型例子 |
|------|------|----------|
| **Confidential Client(机密客户端)** | 能安全保管凭据(如 client_secret)的客户端,通常有服务端组件 | 传统 Web 应用后端、后台服务 |
| **Public Client(公共客户端)** | 无法保守秘密的客户端——代码/二进制分发到用户手中,任何 secret 都可被提取 | SPA(浏览器内 JS)、移动 App、桌面/CLI 应用 |

这一区分决定了安全设计:Public Client **不应持有 client_secret**(写进前端代码或 App 包里的 secret 等于公开),必须依赖 PKCE 等机制保证安全。

### 客户端认证方式

Confidential Client 调用 token 端点时需要向 AS 证明自己的身份:

| 方式 | 机制 | 说明 |
|------|------|------|
| `client_secret_basic` | HTTP Basic 认证头:`Authorization: Basic base64(client_id:client_secret)` | RFC 6749 推荐的默认方式;注意 id/secret 需先做 URL 编码再拼接 |
| `client_secret_post` | 把 `client_id`、`client_secret` 放在请求 body 中 | 兼容性方案,不如 Basic 规范 |
| `private_key_jwt` | 客户端用自己的私钥签一个 JWT(RFC 7523),作为 `client_assertion` 提交 | secret 永不离开客户端,支持密钥轮换,金融级(FAPI)场景首选 |
| mTLS(`tls_client_auth`) | 双向 TLS,用客户端证书认证(RFC 8705) | 还可将 token 与证书绑定(证书绑定令牌),防 token 被盗用 |

::: tip 选型建议
一般 Web 后端用 `client_secret_basic` 即可;对安全要求高的场景(开放银行、企业间集成)优先 `private_key_jwt` 或 mTLS,避免共享对称密钥。
:::

## 令牌

### Access Token(访问令牌)

客户端访问 Resource Server 时出示的凭证。要点:

- **Bearer 语义**(RFC 6750):"持有者令牌"——**谁拿到就能用**,不验证出示者身份。这就是为什么防泄漏(全程 TLS、不入日志、不放 URL)如此重要。
- **短有效期**:通常 5 分钟到 1 小时,靠 Refresh Token 续期。
- **权限受限**:只覆盖授权时批准的 scope。

### Refresh Token(刷新令牌)

用于在 Access Token 过期后**换取新的 Access Token**,避免反复让用户登录:

- 只发给客户端,只对 AS 的 token 端点使用,**绝不发给 Resource Server**;
- 有效期长(数天到数月),因此价值更高,须妥善存储;
- 现代实践要求对 Public Client 做 **rotation(轮换)**:每次使用后作废并签发新的 Refresh Token,重放旧 token 即视为泄漏,撤销整个令牌族(详见[流程页](./flows.md#refresh-token-流程))。

### opaque vs JWT

| 格式 | 验证方式 | 优点 | 缺点 |
|------|----------|------|------|
| **Opaque(不透明)** | RS 调用 AS 的 introspection 端点(RFC 7662)查询 | 可即时撤销;不泄露内部信息 | 每次验证有网络开销 |
| **JWT(自包含)** | RS 用 AS 公钥本地验签(RFC 9068 规范了 JWT Access Token) | 无网络开销,适合高吞吐/微服务 | 签发后无法即时撤销,只能靠短有效期兜底 |

::: warning
Access Token 的格式是 AS 与 RS 之间的约定。**客户端不应解析 Access Token 的内容**,即使它恰好是 JWT——把它当作不透明字符串。需要用户信息请用 OIDC 的 ID Token 或 UserInfo 端点。
:::

## Scope(权限范围)

`scope` 是空格分隔的字符串列表,表达客户端申请的权限范围,例如:

```text
scope=calendar.read calendar.write profile
```

- AS 可以**缩减**客户端申请的 scope(用户拒绝部分权限),最终生效的 scope 会在 token 响应中返回;
- 设计原则:**最小权限**、读写分离(`resource.read` / `resource.write`)、粒度适中(过细导致授权页不可读,过粗导致权限过大);
- scope 表达的是"客户端能做什么",不等于"用户能做什么"——RS 仍需叠加自身的用户级权限检查。

## redirect_uri 与精确匹配

`redirect_uri` 是授权完成后 AS 把授权码送回客户端的地址。**它是授权码流安全性的命门**:如果攻击者能让 AS 把 code 发到自己控制的地址,就能窃取授权。

::: danger 必须精确匹配
客户端注册时登记完整的 redirect_uri,授权请求中的值必须与登记值**逐字符精确匹配**(RFC 9700 / OAuth 2.1 强制要求)。禁止:

- 前缀匹配、子域名通配(`https://*.example.com/cb`);
- 只校验域名不校验路径;
- 允许 `redirect_uri` 携带任意查询参数再"模糊匹配"。

历史上大量重大 OAuth 漏洞(开放重定向 → 授权码泄漏)都源于宽松的 redirect_uri 校验。
:::

## 端点

| 端点 | 谁调用 | 作用 | 定义 |
|------|--------|------|------|
| **Authorization Endpoint**(授权端点) | 用户浏览器(前端信道) | 用户登录、同意授权,签发授权码 | RFC 6749 |
| **Token Endpoint**(令牌端点) | 客户端(后端信道,服务器对服务器) | 用授权码/Refresh Token/客户端凭据换取令牌 | RFC 6749 |
| **Revocation Endpoint**(撤销端点) | 客户端 | 主动作废不再需要的 Access/Refresh Token(如用户登出、卸载应用) | RFC 7009 |
| **Introspection Endpoint**(内省端点) | Resource Server(需认证) | 查询 token 是否有效及其元数据(scope、过期时间、所属用户) | RFC 7662 |

端点地址可通过 **AS Metadata**(RFC 8414)自动发现:请求 `https://as.example.com/.well-known/oauth-authorization-server` 得到 JSON 配置文档,避免硬编码。

## state 参数与 CSRF 防护

`state` 是客户端在授权请求中带上的随机不可猜测值,AS 会在回调时原样返回。客户端必须校验回调中的 `state` 与本地会话保存的值一致。

它防御的攻击(登录 CSRF / 会话混淆):攻击者用**自己的**授权码构造回调 URL 诱骗受害者访问,受害者的客户端会话被静默绑定到攻击者的账号,后续受害者写入的数据(如上传文件、绑定支付方式)落到攻击者账户中。

要求:

- 每次授权请求生成新的、密码学随机的 `state`(≥128 位熵),与用户会话绑定;
- 回调时**先校验 state,不匹配立即中止**;
- 使用 PKCE 后,PKCE 也能覆盖此类攻击面,但 `state` 依然是推荐做法(还可承担防重放、恢复上下文的作用;若用它携带业务状态,应只放不可伪造的引用而非明文数据)。

## PKCE

**PKCE**(Proof Key for Code Exchange,RFC 7636,读作 "pixy")为授权码交换增加动态证明,防御**授权码拦截攻击**。

### 原理

1. 客户端每次授权前生成随机字符串 `code_verifier`(43–128 个字符,密码学随机);
2. 计算 `code_challenge = BASE64URL(SHA256(code_verifier))`,即 **S256** 方法;
3. 授权请求带上 `code_challenge` 和 `code_challenge_method=S256`,AS 将其与签发的授权码绑定存储;
4. 客户端用授权码换 token 时,提交原始 `code_verifier`;
5. AS 对收到的 verifier 做同样的 SHA256 运算,与之前存的 challenge 比对,不一致则拒绝。

攻击者即使截获授权码(恶意 App 注册相同的自定义 URL Scheme、系统日志泄漏、浏览器历史),也没有对应的 `code_verifier`,无法完成兑换。

```text
code_verifier  = dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk   (随机生成,仅客户端知道)
code_challenge = E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM   (SHA256 后 base64url)
```

::: warning 不要使用 plain 方法
`code_challenge_method=plain`(challenge 直接等于 verifier)只是兼容遗留的降级选项,失去了单向性保护。始终使用 **S256**。
:::

### 为何对所有客户端都推荐

PKCE 最初为移动 App 等 Public Client 设计,但 **RFC 9700 与 OAuth 2.1 要求所有使用授权码模式的客户端(包括持有 client_secret 的 Confidential Client)一律使用 PKCE**,原因是:

- client_secret 只能证明"是这个客户端",不能把**这一次授权码**与**这一次请求**绑定;PKCE 提供的是每次交易级别的绑定;
- PKCE 可防御授权码注入(attacker 把窃得的 code 注入受害者的回调)——这类攻击对 Confidential Client 同样有效;
- 实现成本极低(两次哈希运算),统一开启没有负担。

## 下一步

- [典型流程](./flows.md):看这些概念如何组合成完整的授权流程
- [典型参数与响应参考](./reference.md):各端点的参数与错误码速查
