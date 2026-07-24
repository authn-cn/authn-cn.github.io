---
title: "QQ 音乐第三方登录:与标准的差距与改造建议"
---

# QQ 音乐第三方登录(账号绑定):与标准的差距与改造建议

本文是**评价页**,逐项对照 OAuth 2.0 / OpenID Connect(OIDC)标准,分析 QQ 音乐「第三方登录 / 账号绑定」的差距、风险与改造建议。落地对接步骤见 [QQ 音乐第三方登录对接实现](./qqmusic.md)。

::: tip 一句话结论
QQ 音乐的账号互通与 [喜马拉雅账户互通](./ximalaya-review.md) 是**同一类设计**:不用令牌,而是"透传你方票据 `token` + QQ 音乐后台每次同步回调你方验证接口"。它比喜马**多做对了一件事**——回调带了 `sign` 签名 + `timestamp`,让你方能验证请求确实来自 QQ 音乐;但仍停留在**私有票据 + 同步回调 + 对称密钥(MD5)**的模型,缺 `id_token`、缺标准声明、缺发现文档,签名算法用的还是已被攻破的 MD5。设备端扫码登录也自成一套,而它正对应标准的[设备授权流(RFC 8628)](https://datatracker.ietf.org/doc/html/rfc8628)。
:::

## 场景对齐标准

这套东西在标准里叫**联合登录 / 账户关联**:你方是身份源(应为 **OpenID Provider**),QQ 音乐是消费身份的 **Relying Party**。标准做法是——你方签发**签名的 `id_token`**(+ `access_token`),QQ 音乐**离线验签**(靠你方 JWKS 公钥),必要时再用 `access_token` 调你方标准 **UserInfo** 端点。QQ 音乐当前的做法把这套换成了"透传不透明 `token` + 每次同步回调"。

## 现状 → 标准对应总览

| 维度 | QQ 音乐现状 | 标准对应 |
|---|---|---|
| 身份载体 | 不透明第三方 `token`(字符串) | 签名 JWT `id_token`([OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)、[RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)) |
| 校验方式 | QQ 音乐后台**每次同步回调**你方验证接口 | RP 用 JWKS **离线验签**([OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html)) |
| 用户标识 | 私有 `unionId` | `sub`([OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)) |
| 请求真实性 | `sign` = **MD5**(参数 + `appkey`)+ `timestamp` | JWS 非对称签名([RFC 7515](https://datatracker.ietf.org/doc/html/rfc7515))或 HMAC-SHA256、mTLS([RFC 8705](https://datatracker.ietf.org/doc/html/rfc8705)) |
| 结果表达 | body 内 `ret`(`0` 成功) | HTTP 状态码 2xx/4xx/5xx([RFC 9110 §15](https://datatracker.ietf.org/doc/html/rfc9110#section-15)) |
| 令牌新鲜度 | `expireTime` 缓存时长(后台缓存 token) | `exp`/`iat`/`nonce` 声明([OIDC Core §3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)) |
| 设备扫码登录 | 私有 `qrCodeLogin` + 轮询 | 设备授权流([RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628)) |
| 发现 / 元数据 | 无 | [OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) / [RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414) |

---

### 问题 1:身份靠不透明票据 `token`,没有令牌模型

**现状**:第三方身份由一个不透明 `token` 字符串代表,QQ 音乐不解析、只透传回调你方验证。

**标准怎么做**:身份应承载在**签名 JWT `id_token`** 里,含结构化、可校验的标准声明。见 [OIDC Core §2](https://openid.net/specs/openid-connect-core-1_0.html#IDToken) 与 [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)。

**为什么是问题·风险**:不透明 token 意味着 QQ 音乐无法独立判断用户真伪,只能每次把球踢回你方接口(见问题 2);也没有 `iss`/`aud`/`exp` 等声明(见问题 5)。

**建议**:用 `id_token` 取代裸 `token`,以 `sub` 取代 `unionId`。

---

### 问题 2:每次账号操作都要**同步回调**你方接口,强耦合

**现状**:QQ 音乐后台在**每次**绑定 / 解绑 / 登录时都同步 POST 你方验证接口校验 `token`。官方文档自己都写明:"三方登录**依赖合作方后台稳定性**,且多一次网络延时也会更高,**非必要不建议使用**"。

**标准怎么做**:令牌离线验签模型下,RP 只需**缓存你方 JWKS 公钥**即可校验,登录不依赖你方接口实时可用;需要吊销时才按需查 [RFC 7662 内省](https://datatracker.ietf.org/doc/html/rfc7662) / [RFC 7009 吊销](https://datatracker.ietf.org/doc/html/rfc7009)。

**为什么是问题·风险**:你方接口一抖动 / 宕机,QQ 音乐侧账号操作直接失败;每次多一跳网络时延;你方接口成为登录链路的硬依赖与新增公网攻击面。QQ 音乐用 `expireTime` 缓存 token 来缓解,但这只是打补丁。

**建议**:改为离线验签的 `id_token`;确需实时状态时走标准内省接口,而非每次全量回调。

---

### 问题 3:签名用 MD5——算法已被攻破

**现状**:请求真实性靠 `sign`,算法是**对拼接串做 MD5**(`md5(appId=..&music_app_id=..&timestamp=..&token=..&unionId=.._appkey)`),`appkey` 为共享密钥。

**标准怎么做**:请求 / 令牌完整性应使用 **JWS 非对称签名**([RFC 7515](https://datatracker.ietf.org/doc/html/rfc7515),如 RS256/ES256)或至少 **HMAC-SHA256**;服务器间调用可叠加 **mTLS**([RFC 8705](https://datatracker.ietf.org/doc/html/rfc8705))。

**为什么是问题·风险**:
- **MD5 已被证明不安全**(碰撞攻击成熟),不应再用于任何安全签名场景;
- 这种"拼接串 + 尾部拼 `appkey` 再 MD5"的构造还易受**长度扩展**类攻击影响,不是规范的 HMAC;
- 用的是**对称共享密钥**(`appkey` 两边都有),任一方泄露即可伪造;非对称签名只有签发方能签、验证方只持公钥。

**建议**:短期至少换成 **HMAC-SHA256**;正规做法是你方以 JWS 签发 `id_token`,QQ 音乐用你方公钥(JWKS)验签。

> 值得肯定:QQ 音乐**有** `sign` + `timestamp`,比 [喜马拉雅](./ximalaya-review.md#问题-4-回调链路没有任何签名-完整性-来源认证)(回调完全无签名)在来源认证上更进一步——问题在**算法选型**,而非缺失。

---

### 问题 4:结果用 body 里的 `ret` 表达,而非 HTTP 状态码

**现状**:验证接口与 SDK 操作都用 body 内 `ret`(`0` 成功,非 0 异常;如 `10010` 绑定关系混乱、`10014` 未绑定)表达结果。

**标准怎么做**:HTTP 状态码是**协议层**结果信号([RFC 9110 §15](https://datatracker.ietf.org/doc/html/rfc9110#section-15)):成功 `2xx`、客户端 / 业务错误 `4xx`、服务端故障 `5xx`;OAuth 错误另有机读 `error` 枚举([RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2)),现代 HTTP API 用 [Problem Details(RFC 9457)](https://datatracker.ietf.org/doc/html/rfc9457)。

**为什么是问题·风险**:body-code 与 HTTP 状态双轨,网关 / 负载均衡 / 监控依据 HTTP 状态做限流、熔断、重试与告警,恒 `200` 会让它们误判成功;`ret` 值域私有,无法用标准错误处理逻辑复用。

**建议**:HTTP 状态码承载结果,body 承载细节;错误对齐 RFC 6749 §5.2 或 RFC 9457。

---

### 问题 5:`unionId` 是裸标识,缺 `iss`/`aud`/`exp`/`nonce`

**现状**:身份仅由 `unionId` 表示,配一个 `expireTime` 缓存时长;没有签发者、受众、过期、防重放随机数等声明。

**标准怎么做**:ID Token 必备并强制校验 `iss`/`sub`/`aud`/`exp`/`iat`(及登录场景的 `nonce`),见 [OIDC Core §2](https://openid.net/specs/openid-connect-core-1_0.html#IDToken) 与 [§3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)。

**为什么是问题·风险**:缺 `aud` → 票据可能被复用到别的 RP;缺 `exp`/`nonce` → 重放成本低(`expireTime` 只是服务端缓存 TTL,不等于令牌自带的、可验签的过期声明);缺 `iss` → 无法从令牌本身确认签发来源。

**建议**:第三方标识用 `sub`,连同 `iss`/`aud`/`exp`/`iat`/`nonce` 一并置于签名 JWT 内下发与校验。

---

### 问题 6:设备端扫码登录是私有实现,而非设备授权流

**现状**:车机 / 设备端扫码登录用私有的 `qrCodeLogin` + `getLoginQrCode` + `pollQrCodeLoginResult`(轮询二维码结果)。

**标准怎么做**:车机、机顶盒这类**输入受限设备**扫码登录,正是 **OAuth 2.0 设备授权流([RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628))** 的设计场景——设备拿 `device_code`/`user_code`,用户在手机确认,设备轮询令牌端点。

**为什么是问题·风险**:私有扫码协议无法复用标准库、难以审计;而设备流是 IETF 正式标准,主流 IdP 开箱即用。QQ 音乐现有的"取二维码 + 每秒轮询结果"其实与设备流高度同构,却是私有形态。

**建议**:设备端扫码对齐 RFC 8628;有 WebView 时用授权码 + PKCE([RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636))。

---

### 问题 7:私有参数命名 + 无发现文档

**现状**:`login_type=7`、`partner_name`/`partner_id`/`partner_appid`/`partner_access_token` 等均为私有约定;端点写死,无 `.well-known` 发现文档、无 JWKS。

**标准怎么做**:[OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) / [RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414) 提供机读元数据与 `jwks_uri`,端点与公钥可自动发现、自动轮换。

**为什么是问题·风险**:私有参数与写死端点导致每次对接都要重新理解 QQ 音乐专有约定,无法用标准客户端库;密钥轮换只能靠人工。

**建议**:提供标准发现文档 + JWKS;私有参数映射到标准参数。

---

## 改造建议(按优先级)

1. **引入签名 `id_token`(最高价值)**:你方以 JWS 签发 `id_token`,QQ 音乐用 JWKS **离线验签**并校验 `iss`/`aud`/`exp`/`nonce`,以 `sub` 取代 `unionId`。一举解决问题 1、2、5,并让同步回调从"必需"降级为"可选"。
2. **签名算法换代**:MD5 → 至少 HMAC-SHA256,正规走 JWS 非对称签名。解决问题 3。
3. **HTTP 状态码用对**:验证 / 操作接口成功 `2xx`、业务失败 `4xx`、故障 `5xx`;错误对齐 [RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2) 或 [RFC 9457](https://datatracker.ietf.org/doc/html/rfc9457)。解决问题 4。
4. **设备扫码走设备授权流**:对齐 [RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628)。解决问题 6。
5. **提供 Discovery + JWKS**:端点与公钥可自动发现、可轮换。解决问题 7。

> 短期最有价值的两条是 **#1(签名 `id_token` 取代不透明 token)** 与 **#2(弃用 MD5)**:前者让登录不再强依赖你方接口可用性,后者堵住最直接的伪造面。

## 参考标准

- [RFC 6749 — OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)(错误 [§5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2))· [RFC 6750 — Bearer](https://datatracker.ietf.org/doc/html/rfc6750)
- [RFC 8628 — 设备授权流](https://datatracker.ietf.org/doc/html/rfc8628) · [RFC 7636 — PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 7662 — 令牌内省](https://datatracker.ietf.org/doc/html/rfc7662) · [RFC 7009 — 令牌吊销](https://datatracker.ietf.org/doc/html/rfc7009)
- [RFC 8414 — 授权服务器元数据](https://datatracker.ietf.org/doc/html/rfc8414) · [RFC 8705 — mTLS 客户端认证](https://datatracker.ietf.org/doc/html/rfc8705)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)(ID Token [§2](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)、校验 [§3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation))· [OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [RFC 7519 — JWT](https://datatracker.ietf.org/doc/html/rfc7519) · [RFC 7515 — JWS](https://datatracker.ietf.org/doc/html/rfc7515)
- [RFC 9110 — HTTP 语义(状态码 §15)](https://datatracker.ietf.org/doc/html/rfc9110#section-15) · [RFC 9457 — Problem Details](https://datatracker.ietf.org/doc/html/rfc9457)

**相关文档**

- [QQ 音乐第三方登录对接实现](./qqmusic.md) · [喜马拉雅账户互通评价](./ximalaya-review.md)(同类设计对比)
- [OAuth 2.0 文档](../oauth2/) · [OpenID Connect 文档](../oidc/)
