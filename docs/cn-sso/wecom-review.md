---
title: "企业微信扫码登录:与标准的差距与改造建议"
---

# 企业微信扫码登录:与标准的差距与改造建议

> 本页是**评价 / 分析**页。想看具体怎么对接、后端三步怎么调、字段怎么填,请看 [企业微信扫码登录对接落地](./wecom.md);本页只谈企业微信这套实现与标准 [OAuth 2.0](../oauth2/) / [OIDC](../oidc/) 之间差在哪、有什么风险、该怎么改。

::: tip 一句话结论
企业微信扫码登录看着像 OAuth2 授权码模式,骨架也确实是——前端拿 `code`、后端换用户。但它偏离标准的每一处都很关键:后端拿的是**应用级 `access_token`**(能读整个通讯录,不是"某用户授权给你的令牌"),要**三步**才能拿到用户详情,**没有 `id_token`、不是 OIDC**,用户标识是私有的 `userid` 而非标准 `sub`,**不用 PKCE**,错误结构是私有的 `errcode`/`errmsg`,也**没有发现文档 / JWKS**。最危险的一条:它把"身份认证"和"读取组织通讯录的权限"耦合进同一枚长期凭据——这枚 token 一旦泄露,等于全员通讯录外泄。核心建议:应用级 token 严格锁在后端、最小可见范围、按 `expires_in` 缓存,前端只碰 `code`;要对外提供标准 OIDC,就在企业微信之上包一层身份网关。可对比 [微信扫码登录评价](./wechat-review.md)。
:::

## 现状 → 标准对应

| 维度 | 企业微信现状 | 标准怎么做 | 差距 |
|---|---|---|---|
| access_token 语义 | **应用级**:`gettoken`(corpid+secret)换来,代表**应用**、能读全员通讯录 | [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) 的 access_token 代表**用户委托授权**的范围 | 权限过宽,拿到即可读全员 |
| 取用户流程 | **三步**:gettoken → getuserinfo(code→userid) → user/get(userid→详情) | [OIDC](https://openid.net/specs/openid-connect-core-1_0.html) 一个 `id_token` + 可选一次 UserInfo | 多一次服务端往返、多一枚全权 token |
| 身份令牌 | **无 `id_token`**,无签名身份断言 | OIDC 签名的 `id_token`,带 `iss/aud/exp/nonce` | 无法离线验签、无防重放语义 |
| 用户标识 | 私有 `userid`(企业内唯一) | 标准 `sub` | 需自建映射层 |
| PKCE | **不使用** | [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636) / [OAuth 2.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) 要求公共/授权码流程用 PKCE | 少一层授权码防截获 |
| 错误表达 | 私有 `errcode`/`errmsg`,HTTP 常年 200 | [RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2) 的 `error` + [RFC 9110 §15](https://datatracker.ietf.org/doc/html/rfc9110#section-15) 状态码 | 需在你侧翻译成标准语义 |
| 端点发现 | **写死**,无发现文档 | [OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) / [RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414) 提供 metadata + JWKS | 端点/密钥变更需改代码 |

---

## 逐项分析

### 问题 1:`access_token` 是"应用级"而非"用户级",权限过宽

**现状**:企业微信后端用 `gettoken`(拿 `corpid` + `corpsecret`)换来一枚 `access_token`。这枚 token 代表的是**你的应用本身**,凭它就能调 `user/get` 读取**整个通讯录**里任何人的详情——它并不是"某个用户在扫码登录时授权给你的那一份令牌"。前端扫码拿到的 `code`,只是用来在这枚应用级 token 之下查出"当前是哪个 `userid`"。

**标准怎么做**:[RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) 里的 access_token 语义是**被授权用户委托的凭据**——它代表"某用户同意了你在某个 scope 内代表他访问资源",而不是"应用对全库的通行证"。令牌按 [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750) 作为 Bearer 令牌携带,其权限边界由授权时的 scope 与被授权主体共同约束。

**为什么是问题 · 风险**:这套模型把"识别登录者是谁"这件轻量的事,建立在了一枚**能读全员通讯录**的重型凭据之上。权限严重过宽:登录场景本只需要"当前用户的身份",却握着"读所有人"的能力。这枚 token 一旦泄露或被前端误持有,攻击者拿到的不是一个用户的数据,而是**整个组织通讯录**。

**建议**:应用级 `access_token` **绝不进前端**,严格由后端保管;应用的可见范围 / 通讯录权限按**最小必要**配置,不给登录用应用开放超出所需的通讯录范围;把"识别登录者"与"读取通讯录"在你侧的代码里显式分层,别让登录逻辑顺手握着全员读权限。

### 问题 2:三步才能取到用户,标准一步即可

**现状**:企业微信取用户走**三步**:① `gettoken` 拿应用级 token;② `auth/getuserinfo`(或 Web 登录对应接口)拿 `code` 换 `userid`;③ `user/get` 用 `userid` 换用户详情。见 [企业微信开发者中心](https://developer.work.weixin.qq.com/document/path/98152)。

**标准怎么做**:[OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html) 里,授权码换回的 [`id_token`](https://openid.net/specs/openid-connect-core-1_0.html#IDToken) **本身就带着经过签名的身份信息**(`sub` 及基础 claim),需要更多资料时再调**一次** [UserInfo](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo) 端点即可。身份信息随令牌直达,不必额外拿一枚全权 token 再回查。

**为什么是问题 · 风险**:多一步服务端往返本身是成本;更关键的是,第一步引入的那枚**应用级 token**(问题 1)成了整条链路的必经品——为了"认出一个人",你被迫先持有"读所有人"的凭据。流程复杂度和权限面同时被放大。

**建议**:接受企业微信这套三步流程的现实,但在你侧把它**收敛成一个"登录"服务**:对外只暴露"给我 code、还你标准身份对象",把 gettoken / getuserinfo / user/get 三步及应用级 token 全部封在这个服务内部,不外泄。

### 问题 3:没有 `id_token`,根本不是 OIDC

**现状**:整个流程**没有 `id_token`**。企业微信返回的是 `userid` 加一坨用户详情字段,没有一枚**签名的身份令牌**,自然也没有 `iss`(签发者)、`aud`(受众)、`exp`(过期)、`nonce`(防重放)这些身份断言的核心字段。

**标准怎么做**:[OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html) 的 `id_token` 是一枚 [JWT](../tools/jwt.html),由 IdP 签名,携带 [`iss/aud/exp/nonce` 等标准声明](https://openid.net/specs/openid-connect-core-1_0.html#IDToken);消费方可以**离线验签**确认"这确实是该 IdP 为该应用签发、未过期、未被重放"的身份断言。

**为什么是问题 · 风险**:没有签名身份令牌,意味着"用户是谁"这个结论完全依赖你对企业微信 HTTP 响应的信任,无法自证来源与完整性;缺 `aud` 无法防止令牌被挪用到别的应用,缺 `nonce` 无法防重放,缺 `exp` 无法约束时效。这是"接口返回了个用户信息"与"拿到一份可验证的身份断言"的本质差别。

**建议**:如果你只是内部登录,认清这不是 OIDC、按接口信任模型处理即可;如果要对外或对接标准 RP,由你的**身份网关补发标准 `id_token`**(见问题 8 的改造方向),把企业微信的响应转化成一枚你签名的、带齐 `iss/aud/exp/nonce` 的 JWT。

### 问题 4:用户标识是私有 `userid`,不是标准 `sub`

**现状**:企业微信标识用户用的是**企业内的 `userid`**——它在单个企业(corp)范围内唯一,是个私有标识,而非标准的 `sub`。

**标准怎么做**:[OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html) 规定用 [`sub`](https://openid.net/specs/openid-connect-core-1_0.html#IDToken) 作为主体的稳定唯一标识,标准 RP 默认按 `sub` 认人。

**为什么是问题 · 风险**:标准消费方期望 `sub`,拿到的却是 `userid`,直接对接会字段对不上;而且 `userid` 的唯一性只在企业内成立,跨企业 / 跨系统直接拿它当主键会撞车或认错人。

**建议**:在你侧建**映射层**,把企业微信 `userid` 明确映射到你系统内部的标准 `sub`;私有 `userid` 收敛在映射层内,对上游只暴露标准 `sub`。

### 问题 5:不使用 PKCE

**现状**:企业微信扫码登录的授权码流程**不使用 PKCE**——`code` 换取用户信息时靠的是应用级 token(corpid+secret),没有 `code_verifier` / `code_challenge` 这层绑定。

**标准怎么做**:[RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636) 定义 PKCE 把授权请求与令牌请求用一对 `code_verifier`/`code_challenge` 绑定,防止授权码被截获后重放。[RFC 9700(OAuth 2.0 安全最佳实践)](https://datatracker.ietf.org/doc/html/rfc9700) 与 [OAuth 2.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) 已把 PKCE 提升为**所有授权码流程的默认要求**(不再只限公共客户端)。可用 [PKCE 在线工具](../tools/pkce.html) 理解这对参数。

**为什么是问题 · 风险**:没有 PKCE,授权码在回调链路中若被截获(恶意应用、日志泄露、重定向劫持),攻击者有机会拿它换信息。企业微信这里因为换取动作发生在服务端且需应用级 token,风险被部分对冲,但这是"用另一套私有约束替代标准防护",不等于标准意义上的授权码防截获。

**建议**:这一条你无法在企业微信侧补上 PKCE;做法是确保 `code` 的换取**始终在后端完成**、`code` 不在前端多余暴露、回调链路走 HTTPS 且校验来源;若在企业微信之上包标准 OIDC 网关(问题 8),对**你自己**的授权码流程启用 PKCE。

### 问题 6:错误结构私有 `errcode`/`errmsg`,不靠 HTTP 状态码

**现状**:企业微信接口出错返回私有的 `errcode`(数字)+ `errmsg`(文案),而且业务错误时 **HTTP 状态码通常仍是 200**——错在哪要靠解析响应体里的 `errcode` 才知道。

**标准怎么做**:[RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2) 定义了标准的错误响应结构(`error`、`error_description` 等,取值如 `invalid_grant`、`invalid_client`);[RFC 9110 §15](https://datatracker.ietf.org/doc/html/rfc9110#section-15) 则规定用 **HTTP 状态码**表达请求的成败语义(4xx 客户端错、5xx 服务端错)。

**为什么是问题 · 风险**:错误语义私有,标准 OAuth 客户端 / SDK 无法直接理解;HTTP 200 裹着业务错误,会让"按状态码判断成败"的通用中间件、监控、重试逻辑全部失灵——它们以为成功了,实际上业务失败了。排障与自动化都要为这套私有约定单独适配。

**建议**:在你侧的封装层把企业微信 `errcode`/`errmsg` **翻译成标准语义**:映射到合适的 HTTP 状态码 + 标准 `error` 取值,对上游暴露标准错误结构,把私有错误码表维护在一处。

### 问题 7:应用级 token 有配额、需服务端缓存,身份与通讯录权限耦合

**现状**:应用级 `access_token` 有**有效期(`expires_in`)和调用配额**,官方要求服务端**缓存复用**、临期再刷新,不能每次现取。而这枚被缓存的、长期存活的凭据,同时承担了"用于识别登录者"和"能读全组织通讯录"两重身份。

**标准怎么做**:OAuth2 中,面向"访问资源"的 access_token 与面向"证明身份"的 id_token 是**分离**的两类凭据([RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) / [OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html)),各自 scope 与生命周期独立,身份证明不必绑定一枚全权数据访问令牌。

**为什么是问题 · 风险**:把"身份认证"和"通讯录读取权限"耦合进**同一枚长期缓存的凭据**,极大放大了泄露影响面——这枚 token 泄露不是"某人被冒充",而是**全员通讯录外泄**。长期存活 + 缓存落地(内存/Redis/配置)又增加了它被读到的机会。这是问题 1 在时间维度上的放大版。

**建议**:按 `expires_in` 正确缓存刷新,但把缓存**锁在后端可信存储**、加密 / 权限隔离、绝不落进前端或客户端可达处;登录用应用与需要大范围通讯录读取的应用**尽量拆开**,让"登录"这枚 token 的通讯录可见范围压到最小;记录该 token 的使用与告警异常调用。

### 问题 8:无发现文档 / JWKS,端点写死

**现状**:企业微信没有 OIDC 那种**发现文档**,也没有 **JWKS**(签名公钥集)——因为它压根没有签名令牌(问题 3)。所有端点地址、参数都**写死**在你的代码 / 配置里。

**标准怎么做**:[OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) 与 [RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414) 提供一份机器可读的 metadata(`.well-known/openid-configuration`),里面列出授权 / 令牌 / UserInfo 端点、支持的 scope、以及 `jwks_uri`——客户端据此**自动发现端点、自动获取验签公钥**,IdP 轮换密钥或调整端点时客户端无需改代码。可参考本站 [Discovery 工具](../tools/discovery.html)。

**为什么是问题 · 风险**:端点写死意味着任何变更都要改代码重发;没有 JWKS 则谈不上标准化的验签密钥轮换(本就没有可验签的令牌)。与标准 OIDC 生态的自动化互操作完全无法对接。

**建议**:内部使用可接受端点写死,但集中配置、别散落各处;若要对外提供标准 OIDC,由身份网关(问题 8 改造)**暴露 discovery 文档与 `jwks_uri`**,用你自己的密钥对补发的 `id_token` 签名,让标准 RP 能自动发现与验签。

---

## 改造建议(按优先级)

1. **先堵最致命的凭据泄露面(问题 1 / 7)**:应用级 `access_token` 严格后端保管、加密存储、**绝不进前端**;登录用应用按**最小可见范围**配置通讯录权限;按 `expires_in` 缓存刷新的同时做好访问隔离与异常告警。这一条直接决定"泄露 = 全员通讯录外泄"这颗雷会不会爆。
2. **把三步流程收敛成一个登录服务(问题 2)**:对外只给"code 换标准身份对象",gettoken / getuserinfo / user/get 与应用级 token 全封在内部。
3. **建 `userid` → `sub` 映射层(问题 4)**:私有 `userid` 收敛在映射层,对上游只暴露标准 `sub`。
4. **错误码翻译成标准语义(问题 6)**:`errcode`/`errmsg` 映射到标准 HTTP 状态码 + `error` 取值,私有码表集中维护。
5. **要对外标准 OIDC 就包一层身份网关(问题 3 / 5 / 8)**:在企业微信之上**补发标准 `id_token`**(带齐 `iss/aud/exp/nonce`)、暴露 [discovery](../tools/discovery.html) 与 `jwks_uri`、对你自己的授权码流程启用 [PKCE](../tools/pkce.html)。让标准 RP 无缝对接,企业微信的私有细节只活在网关内部。

## 参考标准

- [RFC 6749 OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749) —— access_token / 授权语义([令牌端点 §3.2](https://datatracker.ietf.org/doc/html/rfc6749#section-3.2)、[错误响应 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2))
- [RFC 6750 Bearer Token](https://datatracker.ietf.org/doc/html/rfc6750) —— Bearer 令牌的携带与语义
- [RFC 7636 PKCE](https://datatracker.ietf.org/doc/html/rfc7636) —— 授权码防截获
- [RFC 9700 OAuth 2.0 安全最佳实践](https://datatracker.ietf.org/doc/html/rfc9700)
- [OAuth 2.1 draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) —— PKCE 成为授权码流程默认要求
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) —— [`id_token` / `sub`](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)、[UserInfo](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html) —— 发现文档 / `jwks_uri`
- [RFC 8414 OAuth 2.0 Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)
- [RFC 9110 HTTP 语义(状态码 §15)](https://datatracker.ietf.org/doc/html/rfc9110#section-15)
- [企业微信开发者中心(Web 登录 / gettoken / getuserinfo)](https://developer.work.weixin.qq.com/document/path/98152)

---

> 相关:[企业微信扫码登录对接落地](./wecom.md) · [微信扫码登录对接](./wechat.md) · [微信扫码登录评价](./wechat-review.md) · [OAuth 2.0 专题](../oauth2/) · [OIDC 专题](../oidc/) · [PKCE 在线工具](../tools/pkce.html)
