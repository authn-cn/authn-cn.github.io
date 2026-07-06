---
title: Mock 服务器
---

# Mock 认证服务器

**服务地址:<https://mock.authn.tech/>**

这是一套**开箱即用的在线 Mock 认证服务**,部署在 Cloudflare Workers 上。认证/授权流程通常需要多个角色协作(签发令牌的一方、消费令牌的一方、受保护的 API……),自己把它们全搭起来很费事。本 Mock 把这些角色都实现好并放在公网,你可以:

- **联调**:开发客户端时,不必先搭一套 Keycloak / ADFS,直接对接本站的 Mock;反过来,只有服务端也能用本站的 Mock 客户端来打你的服务。
- **集成测试**:CI 中以固定、可预期的响应验证你的认证集成代码(追加 `&user=alice` 可免交互)。
- **学习演练**:配合[协议文档](../oidc/),实际观察每一步报文长什么样。

## 角色与术语

认证流程里的每一方都有固定称呼。下表是本 Mock 覆盖的角色:

| 缩写 | 全称 | 中文 | 在流程里做什么 |
|------|------|------|----------------|
| **RO** | Resource Owner | 资源所有者(终端用户) | 数据的主人,授予同意;本 Mock 中即测试用户 alice / bob |
| **OP** | OpenID Provider | OIDC 身份提供方 / 令牌签发方 | 验证用户身份、签发 `id_token` / `access_token` |
| **RP** | Relying Party | 依赖方 / 客户端(即 OAuth2 的 Client) | 把用户重定向到 OP 登录、消费并校验令牌 |
| **RS** | Resource Server | 资源服务器 / 受保护 API | 校验 `access_token` 后返回受保护数据 |
| **IdP** | Identity Provider | SAML 身份提供方 | 验证用户身份、签发签名的 SAML 断言 |
| **SP** | Service Provider | SAML 服务提供方 / 受信应用 | 发起登录、接收并验签 IdP 的断言 |

> **OAuth 2.0** 定义四个角色:Resource Owner(用户)、Client(客户端)、Authorization Server(授权服务器)、Resource Server(资源服务器)。**OIDC** 在其上把 Authorization Server 叫作 **OP**、把 Client 叫作 **RP**——所以 **RP 就是 Client**,而 **Resource Owner(RO)是另一个角色,即终端用户本人**。
>
> 其中 Resource Owner 是人、不是可 Mock 的服务(本站由授权页选择 alice / bob 代表),因此下文只展开可对接的三个服务角色:**OP · RP · RS**。SAML 一侧对应 **IdP · SP**,与 OIDC 互相对应:OP≈IdP(签发方)、RP≈SP(消费方)。

两侧的角色、端点与分步调用顺序分别见:

- 🔷 [**OIDC / OAuth2 Mock**](./oidc.md) —— OP / RP / RS 三角色 + 授权码 + PKCE 调用顺序
- 🔶 [**SAML Mock**](./saml.md) —— IdP / SP 两角色 + Web Browser SSO 调用顺序

::: danger 仅供测试
签名私钥公开在[源码](https://github.com/authn-cn/authn-mock)中,任何人都能伪造该服务签发的令牌 / 断言;授权码也不保证单次使用(无状态实现)。**任何生产系统都不应信任 Mock 服务签发的断言或令牌。**
:::

## 混搭:用你自己的服务替换其中一环

Mock 的价值在于**只 mock 你还没有的那部分**,其余用你自己的真实服务。常见组合:

| 你已经有 | 用 Mock 补上 | 怎么接 |
|----------|--------------|--------|
| RP / 客户端 | **Mock OP** | 把你 RP 的 issuer 指向 `https://mock.authn.tech`(自动发现 `/.well-known/openid-configuration`) |
| OP / 授权服务器 | **Mock RP** | 打开 [`/rp/`](https://mock.authn.tech/rp/) 控制台,填你的 issuer 与 `client_id`,并把 `…/rp/callback` 加入白名单 |
| 受保护 API 但缺令牌来源 | **Mock OP** | 从 Mock OP 用 `client_credentials` 或授权码取 `access_token`,再拿去调你的 API |
| API 客户端但缺受保护资源 | **Mock RS** | 用 Mock OP 签发的令牌调 [`/rs/api`](https://mock.authn.tech/rs/),验证你客户端的 401 / 403 处理 |
| SP / 受信应用 | **Mock IdP** | 把 [`/saml/idp/metadata`](https://mock.authn.tech/saml/idp/metadata) 导入你的 SP |
| IdP | **Mock SP** | 把你 IdP 的 Metadata 配到 Mock SP,或用 IdP-initiated 发到 Mock SP 的 ACS |

思路统一:**签发方(OP / IdP)与消费方(RP / SP)总是成对出现**,你补齐缺的那一方,让 Mock 与你的真实服务对接,就能端到端跑完整个流程。

实现进展与需求欢迎到 [GitHub](https://github.com/authn-cn/authn-mock) 参与讨论。
