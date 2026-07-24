---
title: "钉钉 SSO:与标准的差距与改造建议"
---

# 钉钉 SSO:与标准协议的差距、风险与改造建议

::: tip 一句话结论
钉钉的 SSO 本质是**自有 OAuth2 变体 + 私有用户字段**:普通版方向 A(企业 IdP 登录进钉钉)既不提供标准 SAML,也不提供标准 OIDC,要标准对接只能靠 IDaaS 桥接;专属版虽收外部 IdP,却走已被淘汰的 OIDC **隐式模式(implicit)**。要与标准生态平滑互通,需在你侧建映射层、把隐式模式换成**授权码 + PKCE**,并推动钉钉补齐发现文档与 JWKS。
:::

本页是**评价 / 差距分析**页。具体接入的落地步骤请看 [钉钉 SSO 接入](./dingtalk.md)。相关标准协议的通用说明见 [OAuth 2.0](../oauth2/)、[OIDC](../oidc/)、[SAML](../saml/)。

---

### 问题 1:方向 A 原生零标准支持

**现状**
普通版钉钉的"方向 A"(以企业自有 IdP 登录进入钉钉)**原生不提供标准 SAML,也不提供标准 OIDC**。企业若想用既有的 IdP(如 Okta、Azure AD、Keycloak 等)对接钉钉,只能引入第三方 IDaaS(阿里云 IDaaS、竹云、宁盾等)作为中间件,由 IDaaS 一侧对接企业 IdP、另一侧对接钉钉私有协议。

| 现状 | 标准怎么做 |
|------|-----------|
| 普通版无 SAML、无标准 OIDC;方向 A 必须加 IDaaS 中间件 | SAML 2.0 / OIDC 的初衷就是让 SP 与 IdP **免中间件直接联邦**,一次配置即可跨厂商互通 |

**为什么是问题 · 风险**
标准协议存在的意义,就是让服务方和身份提供方**不依赖专有中间件**即可建立信任。强制引入 IDaaS 意味着:多一处采购与运维成本、多一跳网络与延迟、多一处信任边界(IDaaS 掌握了断言与令牌的转换,是新的攻击面与单点)。

**建议**
短期只能接受 IDaaS 桥接现状,但要把 IDaaS 当作"协议适配器"而非长期身份中枢,收敛其权限、审计其日志。参见 [SAML 2.0 Core](http://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf) 与 [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) 所描述的直接联邦模型。

---

### 问题 2:私有 OAuth2 变体,无法用通用库直接对接

**现状**
钉钉登录是一套**自有 OAuth2 变体**:端点私有(如 `https://api.dingtalk.com/v1.0/oauth2/userAccessToken`、旧版 `https://login.dingtalk.com/oauth2/auth`),请求参数与返回字段也都私有,与 RFC 定义的通用 OAuth2 授权码流程存在偏离。

| 现状 | 标准怎么做 |
|------|-----------|
| 私有端点、私有参数、私有返回结构 | [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) 定义了统一的授权 / 令牌端点与参数,配合 [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750) 的 Bearer 令牌用法,任意合规客户端库均可直接对接 |
| 无 `.well-known` 发现文档 | [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html) 要求以 `.well-known/openid-configuration` 公布端点元数据 |

**为什么是问题 · 风险**
由于偏离 [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749),你无法用标准 OAuth2/OIDC 客户端库"填个配置就能跑",每次接入都要手写钉钉专用适配代码。适配代码分散、难以复用,升级和安全修补的成本长期存在。

**建议**
在你侧把钉钉封装成一个**独立的 Provider 适配器**,对内暴露统一接口,隔离私有细节;避免把钉钉端点硬编码散落在业务代码中。

---

### 问题 3:返回私有字段,非标准 claim

**现状**
钉钉返回的用户标识是 `userid`、`unionid`、`openid` 等**私有字段**,而非标准 claim;普通登录流程中也**没有 `id_token`**,无法像 OIDC 那样直接拿到经过签名、携带标准声明的身份令牌。

| 现状 | 标准怎么做 |
|------|-----------|
| `userid` / `unionid` / `openid`,非标准 claim | [OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html) 定义 `sub` 作为主体标识,以及 `email`、`name` 等标准 claim |
| 普通登录无 `id_token` | OIDC 以签名的 `id_token`(JWT)承载身份声明,可离线校验 |

**为什么是问题 · 风险**
消费方需要**手工把 `userid`/`unionid`/`openid` 映射到 `sub`**,并自行补齐 `email` 等信息;没有 `id_token` 就没有可验证的身份断言,身份的完整性依赖对私有接口返回值的信任。字段语义不清、映射规则散落时,极易出现"同一人在不同应用被当作不同用户"的错配。

**建议**
在你侧建立一层稳定的**私有字段 → 标准 claim 映射**:以 `unionid` 作为跨应用的稳定主键映射到 `sub`(`openid` 仅在单应用内稳定,不宜作全局主键),集中管理映射规则,对外只暴露标准 claim。

---

### 问题 4:专属版用 OIDC 隐式模式(implicit)

**现状**
专属钉钉可以接受外部 IdP 接入,方式是 **OIDC 隐式模式(implicit)+ `id_token`**,且仅限 SSO 类型账号。隐式流下,`id_token` / 令牌经浏览器前端信道(重定向 URL / 片段)直接返回。

| 现状 | 标准怎么做 |
|------|-----------|
| OIDC 隐式模式,令牌走浏览器前端信道 | 隐式模式已被 [RFC 9700(OAuth 2.0 安全最佳实践)](https://datatracker.ietf.org/doc/html/rfc9700) 明确不推荐,并在 [OAuth 2.1 草案](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) 中被移除;应改用**授权码 + PKCE** |
| 无 PKCE 保护 | [RFC 7636(PKCE)](https://datatracker.ietf.org/doc/html/rfc7636) 通过 code_verifier/code_challenge 防止授权码被截获后滥用 |

**为什么是问题 · 风险**
隐式模式把令牌暴露在浏览器地址栏、历史记录、Referer 与前端脚本可达范围内,**易被截获与重放**,这正是 [RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700) 将其列为不推荐、[OAuth 2.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) 将其整体移除的原因。

**建议**
只要外部 IdP 与钉钉专属版任一侧支持,就把隐式模式切换为**授权码 + PKCE**([RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)):授权码经后端信道换取令牌,配合 PKCE 抵御授权码注入 / 截获。

---

### 问题 5:无发现文档 / JWKS,密钥无法自动轮换

**现状**
钉钉不提供标准的发现文档与 JWKS 端点,对接方只能**手工配置端点地址**,签名密钥也无法通过标准机制自动获取与轮换。

| 现状 | 标准怎么做 |
|------|-----------|
| 手工配置端点,无发现文档 | [OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) 与 [RFC 8414(授权服务器元数据)](https://datatracker.ietf.org/doc/html/rfc8414) 通过 `.well-known` 自动发布端点与 `jwks_uri` |
| 密钥无标准轮换机制 | 标准以 `jwks_uri` 暴露公钥集合,客户端可按 `kid` 自动拉取与轮换,无需人工换配置 |

**为什么是问题 · 风险**
手工配置意味着端点或密钥变更时需要人工介入,容易出现配置漂移与遗漏;缺少 `jwks_uri` 则**无法自动轮换密钥**,一旦密钥更新不及时,验签会中断或被迫延长密钥生命周期(削弱安全性)。

**建议**
推动钉钉(尤其专属版)按 [RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414) / [OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) 提供 `.well-known` 元数据与 `jwks_uri`;在此之前,在你侧的适配层集中管理端点与密钥,并建立密钥变更的告警与手工轮换流程。

---

## 改造建议(按优先级)

1. **专属版:隐式模式改授权码 + PKCE(最高优先级,安全)。** 只要两侧支持,立即切换,消除令牌前端信道暴露风险。参见 [RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700)、[OAuth 2.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)、[RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)。
2. **在你侧建立稳定的映射层。** 以 `unionid` 作跨应用主键映射 `sub`,集中管理 `userid`/`unionid`/`openid` → 标准 claim 的规则,对外只暴露标准语义。参见 [OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html)。
3. **把钉钉封装成独立 Provider 适配器。** 隔离私有端点与参数,避免钉钉细节散落业务代码,便于复用与升级。参见 [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)。
4. **普通版方向 A:用 IDaaS 桥接暴露标准协议(短期)。** 把 IDaaS 定位为协议适配器,收敛权限、强化审计,而非长期身份中枢。
5. **推动钉钉提供 Discovery / JWKS(长期)。** 争取按 [RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414) / [OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) 发布 `.well-known` 与 `jwks_uri`,实现端点自动发现与密钥自动轮换。

---

## 参考标准

- [RFC 6749 — OAuth 2.0 授权框架](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 6750 — OAuth 2.0 Bearer 令牌用法](https://datatracker.ietf.org/doc/html/rfc6750)
- [RFC 7636 — PKCE(授权码交换的证明密钥)](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 9700 — OAuth 2.0 安全最佳实践(BCP)](https://datatracker.ietf.org/doc/html/rfc9700)
- [OAuth 2.1(草案,移除 implicit、强制 PKCE)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)
- [RFC 8414 — OAuth 2.0 授权服务器元数据](https://datatracker.ietf.org/doc/html/rfc8414)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [SAML 2.0 Core](http://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf)
- [钉钉 SSO 概述(官方文档)](https://open.dingtalk.com/document/orgapp/sso-overview)
