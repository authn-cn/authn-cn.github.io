---
title: "微信扫码登录:与标准的差距与改造建议"
---

# 微信扫码登录:与标准的差距与改造建议

> 本文是**评价页**,只谈「差距、风险与改造」。想要一步步的对接落地步骤,请看 [微信扫码登录对接](./wechat.md)。

::: tip 一句话结论
微信"网站应用"扫码登录**本质上是 OAuth2 授权码模式**,骨架能对上,但细节几乎全是私有方言:私有 scope、令牌端点用 GET 且把 `secret` 塞进 URL、没有 `id_token`、用私有 `openid`/`unionid` 当身份、不做 PKCE、错误结构自成一套、也没有发现文档。**微信侧改不了**,能做的是在你方封装层把这些偏差"翻译"回标准语义并堵住泄密面。
:::

微信不是 OpenID Connect,它只是"长得像 OAuth2 的一套私有登录 API"。下面逐项对照标准,说明现状、标准怎么做、为什么是问题、以及你能怎么改。

> 微信有[四种登录方式](./wechat.md#微信登录的几种方式)。**移动应用(App)、网站应用、公众号网页授权**三者后端一致,下文问题 1–7 对它们**都适用**;**小程序**是另一套(`wx.login` + `jscode2session` + `session_key`),偏离标准更远,单列在[问题 8](#问题-8-小程序静默登录与-session-key-对称密钥模型)。

## 现状 → 标准对应总览

| 维度 | 微信现状 | 标准对应 |
|------|----------|----------|
| 授权请求 | `open.weixin.qq.com/connect/qrconnect` + 私有片段 `#wechat_redirect`,`scope=snsapi_login` | RFC 6749 授权端点,scope 为约定字符串(无 `#` 片段黑魔法) |
| 换 token | **GET** `/sns/oauth2/access_token`,`appid`/`secret`/`code` 走 URL 查询串 | RFC 6749 §3.2 令牌端点用 **POST**;§2.3 客户端凭据不进 URL |
| 身份令牌 | 无 `id_token`,需再调 `/sns/userinfo` | OIDC Core:签名 `id_token`,含 `iss/aud/exp/nonce` 等可校验声明 |
| 用户标识 | 私有 `openid`(单应用)/ `unionid`(跨应用) | OIDC 标准 `sub` |
| 公共客户端防护 | 无 PKCE,靠"后端用 secret 换 code" | RFC 7636 PKCE(OAuth 2.1 已设为默认要求) |
| 错误表达 | 私有 `errcode`/`errmsg`,`errcode:0` 为成功,HTTP 恒 200 | RFC 6749 §5.2 `error`/`error_description` + HTTP 4xx |
| 元数据发现 | 端点写死,无 `.well-known` | OIDC Discovery `.well-known/openid-configuration` + JWKS |

---

### 问题 1:私有授权 URL 与非标准 scope

**现状**:授权链接必须拼上私有片段 `#wechat_redirect`,否则微信客户端不识别;`scope` 用私有值 `snsapi_login`(扫码登录)/`snsapi_userinfo` 等,而非标准里由业务约定的可读 scope。

**标准怎么做**:[RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) 的授权端点是普通的 HTTPS URL,`scope` 是空格分隔的字符串列表,不需要任何 URL 片段(`#...`)参与协议语义。

**为什么是问题·风险**:`#wechat_redirect` 是纯客户端约定,标准 OAuth 客户端库不会帮你生成,只能手写拼串,容易漏掉;`snsapi_*` 命名把"scope"和"登录方式/授权类型"混在一起,语义不清,迁移到标准 IdP 时无法直接映射。

**建议**:把授权 URL 的拼装封装成一个函数,集中处理片段与私有 scope;在你系统内部维护一张"微信 scope ↔ 内部权限"的映射表,对上层只暴露标准语义。

---

### 问题 2:换 token 用 GET,把 `secret` 放进 URL

**现状**:`GET https://api.weixin.qq.com/sns/oauth2/access_token?appid=...&secret=...&code=...&grant_type=authorization_code`——`appid`、**`secret`**、`code` 全在查询串里。

**标准怎么做**:[RFC 6749 §3.2](https://datatracker.ietf.org/doc/html/rfc6749#section-3.2) 规定令牌端点必须用 **POST**;[§2.3 客户端凭据](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3) 应放在请求体或 `Authorization` 头,**绝不进 URL**。[OAuth 2.0 Security BCP(RFC 9700)](https://datatracker.ietf.org/doc/html/rfc9700) 和 [OAuth 2.1 draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) 进一步强化了这条。

**为什么是问题·风险**:URL 会进入服务器访问日志、浏览器/代理历史、`Referer` 头。把 `secret` 放进 URL 意味着应用密钥可能随日志一起泄露——这是最严重的一项偏差。虽然此调用发生在后端到后端,但只要中间任何一环记录了完整 URL,密钥即暴露。

**建议**:微信协议本身要求 GET 无法改,但要严格保证:**这次请求只在后端发起,走 HTTPS,`secret` 只从后端安全配置读取**,绝不出现在前端、日志、监控埋点或错误上报里;对该 URL 的日志做脱敏;`secret` 定期轮换。对上游暴露时,由你的后端以标准 POST 令牌端点的形态转包。

---

### 问题 3:不是 OIDC,没有 `id_token`

**现状**:换到的是 `access_token` + `openid`,没有任何签名身份令牌;要拿用户信息还得再发一次 `GET /sns/userinfo`。

**标准怎么做**:[OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) 在授权码流程里直接返回签名的 `id_token`(JWT),内含 `iss`(签发者)、`aud`(受众)、`exp`(过期)、`nonce`(防重放)等可离线校验的声明。

**为什么是问题·风险**:没有 `id_token` 就没有可验证的"身份断言"——你无法用签名确认"这份身份确实来自微信、确实签发给我、尚未过期、与我发起的这次登录绑定"。只能信任一次额外的 `userinfo` 调用结果,多一次网络往返,也多一层被中间篡改的面。`access_token` 是授权凭据,不是身份凭据,拿它当登录态是常见误用。

**建议**:若上游需要 OIDC 语义,由**你的网关/认证服务在校验完微信回包后,补发一枚标准 `id_token`**(带 `iss=你的IdP`、`aud=你的客户端`、`exp`、并回填发起时的 `nonce`),对内统一走 OIDC。参见 [OIDC 概念](../oidc/)。

---

### 问题 4:用户标识是私有 `openid`/`unionid`,不是 `sub`

**现状**:同一用户在不同公众号/应用下的 `openid` 不同;要跨应用识别同一人,必须用 `unionid`(需绑定到同一开放平台账号)。

**标准怎么做**:[OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html) 用 `sub` 作为在签发者范围内稳定、唯一的用户标识。

**为什么是问题·风险**:直接拿 `openid` 当主键,会在多应用场景下把同一个人识别成多个账号;而 `unionid` 只有在正确绑定开放平台后才有,漏配就退化成 `openid`,埋下账号分裂隐患。

**建议**:**跨应用统一以 `unionid` 为准**做主键;在你系统内部生成稳定的内部 `sub`,建立 `(unionid/openid) → 内部 sub` 的映射表,对上层永远只暴露内部 `sub`,隔离微信标识的形态变化。

---

### 问题 5:不使用 PKCE

**现状**:微信不支持 PKCE,防护完全依赖"授权码 `code` 只在后端用 `secret` 交换"这一点。

**标准怎么做**:[RFC 7636(PKCE)](https://datatracker.ietf.org/doc/html/rfc7636) 通过 `code_verifier`/`code_challenge` 把授权码与发起方绑定,防止授权码被截获后重放;[OAuth 2.1 draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) 已把 PKCE 设为所有授权码流程的默认要求,[RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700) 亦强烈建议。

**为什么是问题·风险**:在纯后端(机密客户端)场景下,`secret` 尚能兜底;但一旦是移动端或公共客户端、或授权码可能经过前端/深链回传,缺少 PKCE 就失去了对授权码截获重放的关键防护。

**建议**:保持 `code` **只在后端**用 `secret` 交换,绝不在公共客户端里换 token;若你自建标准授权服务器承接内部流量,对内**强制启用 PKCE**。PKCE 参数可用 [PKCE 工具](../tools/pkce.html) 生成与自查。

---

### 问题 6:错误结构私有

**现状**:所有接口统一返回 `errcode`/`errmsg`,`errcode:0` 表示成功,业务错误也走 HTTP 200,靠 `errcode` 非零判断。

**标准怎么做**:[RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2) 规定令牌端点错误用 `error`/`error_description` 字段,并配合相应 HTTP 4xx 状态码;[RFC 9110 §15 HTTP 状态码语义](https://datatracker.ietf.org/doc/html/rfc9110#section-15) 定义了状态码的正确使用。

**为什么是问题·风险**:HTTP 恒 200 会让标准 HTTP 客户端、网关、监控误判"请求成功";`errcode` 值域是微信私有的,标准 OAuth 库无法识别 `invalid_grant`、`invalid_client` 等标准错误,错误处理逻辑无法复用。

**建议**:在你侧封装层把 `errcode` **翻译成标准 `error` 语义**(如凭据错误→`invalid_client`、code 失效→`invalid_grant`),并映射到正确的 HTTP 4xx 状态码后再对上游返回;保留原始 `errcode`/`errmsg` 于日志便于排障。

---

### 问题 7:无发现文档 / 无 JWKS

**现状**:授权端点、令牌端点、`userinfo` 端点都写死在文档里,没有机器可读的发现文档,也没有 JWKS(因为压根没有签名令牌)。

**标准怎么做**:[OIDC Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html) 通过 `.well-known/openid-configuration` 暴露端点与能力,并用 `jwks_uri` 发布验签公钥。

**为什么是问题·风险**:端点写死意味着微信一旦调整就得改代码;没有 JWKS 也就无从谈论标准的令牌验签与密钥轮换,客户端无法自动发现、自动适配。

**建议**:如问题 3 所述,由你的网关补发标准 `id_token`,并**在你自己的 IdP 上提供 `.well-known/openid-configuration` 与 JWKS**,让内部客户端走标准发现流程;微信端点则收敛到一处配置集中管理。

---

### 问题 8:小程序静默登录与 `session_key` 对称密钥模型

**现状**:小程序走 `wx.login()` **静默**拿 `code`(用户无任何授权点击),后端用 `AppID`+`AppSecret`+`js_code` 调 `/sns/jscode2session` 换回 `openid` + **`session_key`**(+ `unionid`)。`session_key` 是微信与你后端之间的**共享对称密钥**,用于校验 / 解密小程序端上报的加密数据;头像昵称等需前端 `wx.getUserProfile` 由用户单独授权。

**标准怎么做**:OAuth 2.0 / OIDC 的登录是**用户知情授权**的委托,产出的是**签名令牌**(`id_token`,非对称验签),而非双方共享的对称密钥。用户同意见 [RFC 6749 授权流程](https://datatracker.ietf.org/doc/html/rfc6749);身份令牌见 [OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)。

**为什么是问题·风险**:
- **静默登录 = 无显式用户同意**:标准授权强调用户对"把身份委托给谁"的知情同意,`wx.login` 直接静默换 `openid`,与该原则相悖(便利性换来了同意语义的缺失)。
- **`session_key` 是对称共享密钥**:一旦泄露,双方产出的签名 / 解密都可被伪造;它还会随用户再次 `wx.login` 或超时而**静默失效**,导致解密突然失败。对称密钥模型不具备非对称签名"只有签发方能签、验证方仅持公钥"的隔离性。
- **`jscode2session` 同样把 `AppSecret` 作为请求参数**(GET),与[问题 2](#问题-2-换-token-用-get-把-secret-放进-url)同源风险。
- 拿到的仍是私有 `openid`/`unionid`,无 `id_token`、无 `sub`(同[问题 3](#问题-3-不是-oidc-没有-id-token)、[问题 4](#问题-4-用户标识是私有-openid-unionid-不是-sub))。

**建议**:`session_key` **只在后端保存与使用**,绝不下发前端、按微信规则及时刷新;对加密数据务必做官方要求的签名校验;登录态以**你后端自建的会话 / `id_token`** 为准,不要把 `session_key` 或 `openid` 直接当登录凭据;跨端(小程序 + 公众号 + App)统一以 `unionid` 归一到内部 `sub`。

---

## 改造建议(按优先级)

1. **堵密钥泄露面(最高优先级)**:`secret` 只在后端、只走 HTTPS,绝不进前端、日志、Referer、监控上报;对换 token 的 URL 做日志脱敏,定期轮换密钥。对应 [RFC 6749 §2.3](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3) 与 [RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700)。
2. **严格校验 `state` 防 CSRF**:每次授权生成一次性 `state`,回调时严格比对并绑定会话。
3. **统一内部身份**:跨应用以 `unionid` 为主键,映射到内部稳定 `sub`,上层只见 `sub`。
4. **错误码标准化**:在封装层把 `errcode`/`errmsg` 翻译成 [RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2) 的 `error` 语义与正确 HTTP 状态码。
5. **补齐 OIDC 语义(可选、按需)**:由网关在校验微信回包后补发标准 `id_token`,并提供 `.well-known` 发现文档与 JWKS。
6. **对内强制 PKCE**:公共客户端一律走你的标准授权服务器 + PKCE,`code` 绝不在前端换 token。用 [PKCE 工具](../tools/pkce.html) 自查。

微信侧协议不可改,以上全部是**你方封装与缓解层**的工作:对下"翻译"微信方言,对上暴露标准 OAuth2/OIDC 语义。

企业内部场景可对比另一套体系:[企业微信评价](./wecom-review.md) 与 [企业微信对接](./wecom.md)。基础概念见 [OAuth2 文档](../oauth2/) 与 [OIDC 文档](../oidc/)。

## 参考标准

- [RFC 6749 — OAuth 2.0 授权框架](https://datatracker.ietf.org/doc/html/rfc6749)(令牌端点 POST 见 [§3.2](https://datatracker.ietf.org/doc/html/rfc6749#section-3.2);客户端凭据见 [§2.3](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3);错误响应见 [§5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2))
- [RFC 6750 — OAuth 2.0 Bearer Token 使用](https://datatracker.ietf.org/doc/html/rfc6750)
- [RFC 7636 — PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 9700 — OAuth 2.0 安全最佳实践(BCP)](https://datatracker.ietf.org/doc/html/rfc9700)
- [OAuth 2.1 draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [RFC 9110 — HTTP 语义(状态码见 §15)](https://datatracker.ietf.org/doc/html/rfc9110#section-15)
- [微信开放文档 — 网站应用微信登录](https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html)
