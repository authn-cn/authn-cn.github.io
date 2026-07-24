---
title: "网易云音乐登录:与标准的差距与改造建议"
---

# 网易云音乐 OpenAPI 登录:与标准的差距与改造建议

本文是**评价页**,逐项对照 OAuth 2.0 / OpenID Connect(OIDC)标准,分析网易云音乐 OpenAPI 登录的差距、风险与改造建议。落地对接步骤见 [网易云音乐 OpenAPI 登录对接实现](./netease-music.md)。

::: tip 一句话结论
网易云音乐是本站收录的三家音乐 / 音频 SDK([喜马拉雅](./ximalaya-review.md)、[QQ 音乐](./qqmusic-review.md)、网易云)里**最接近标准的一个**:它有**真正的 `accessToken` + `refreshToken` 生命周期**(7 天 / 20 天、可刷新),扫码登录≈[设备授权流](https://datatracker.ietf.org/doc/html/rfc8628)、H5 code 换 token≈授权码流,签名用的是 **RSA_SHA256 非对称签名**(比 QQ 音乐的 MD5 强一个量级)。但它仍**不是 OIDC**(没有 `id_token`、没有标准 claim),把 **`appSecret`/`clientSecret` 当作请求参数**传,结果码塞在响应体里,也没有发现文档 / JWKS。骨架对了,细节仍是私有方言。
:::

## 场景对齐标准

与喜马拉雅 / QQ 音乐"绑定你方账号 + 回调你方验证"的模式不同,网易云是**用户直接登录自己的云音乐账号**——这本身就是标准 OAuth2 的姿势:网易云是**授权服务器**,你的设备是**客户端**,用户授权后设备拿到令牌访问资源。因此它的差距主要在**协议细节是否对齐标准**,而非架构方向。

## 现状 → 标准对应总览

| 维度 | 网易云现状 | 标准对应 |
|---|---|---|
| 令牌模型 | `accessToken`+`refreshToken`,AT 7 天 / RT 20 天,可刷新 ✅ | [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) 访问令牌 + 刷新令牌 |
| 扫码登录 | 私有 `qrcodekey/get` + 轮询,`status` 800/801/802/803 | [设备授权流 RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628)(`device_code`/轮询) |
| H5 授权 | 回调 `grantCode` → `token/get` | 授权码流([RFC 6749 §4.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1)),外加 [PKCE](https://datatracker.ietf.org/doc/html/rfc7636) |
| 客户端密钥 | `appSecret`/`clientSecret` 作为**请求参数**出现 | 凭据不进 URL,放请求体 / 头([RFC 6749 §2.3](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3)) |
| 请求签名 | **RSA_SHA256**(非对称)+ `timestamp` 5 分钟时效 ✅ | JWS 非对称签名([RFC 7515](https://datatracker.ietf.org/doc/html/rfc7515)) |
| 身份令牌 | 无 `id_token`,须调 `profile/get` | 签名 `id_token`([OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)) |
| 用户标识 | 裸 `id`(`openId`/`unionId` 已失效) | `sub`([OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)) |
| 结果表达 | 响应体 `code`(200/400/500/1406…) | HTTP 状态码([RFC 9110 §15](https://datatracker.ietf.org/doc/html/rfc9110#section-15)) |
| 发现 / 元数据 | 无,端点写死、公钥手工上传 | [OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) / [RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414) + JWKS |

---

### 值得肯定的两点(先说好的)

- **完整的令牌生命周期**:`accessToken`(7 天)+ `refreshToken`(20 天)+ 刷新接口,与 OAuth2 的访问 / 刷新令牌模型基本一致——这是喜马拉雅 / QQ 音乐都没有做到的。
- **非对称签名 RSA_SHA256**:你用私钥签名、平台用你上传的公钥验签,再加 `timestamp` 5 分钟时效防重放。相较 [QQ 音乐用已被攻破的 MD5](./qqmusic-review.md#问题-3-签名用-md5——算法已被攻破),这是正确方向。

下面是仍与标准存在差距的地方。

### 问题 1:`appSecret` / `clientSecret` 作为请求参数传递

**现状**:文档示例中,取二维码、换 token 等请求的查询串里带 `appSecret=...`;刷新接口更是把 `clientSecret` 列为 `bizContent` 的**必传业务参数**。

**标准怎么做**:[RFC 6749 §2.3](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3) 要求客户端凭据放在请求体或 `Authorization` 头,**绝不进 URL**;[§3.2](https://datatracker.ietf.org/doc/html/rfc6749#section-3.2) 令牌端点用 POST。[RFC 9700 安全 BCP](https://datatracker.ietf.org/doc/html/rfc9700) 同样强调。

**为什么是问题·风险**:URL / 查询串会进访问日志、代理、浏览器历史、`Referer`;把 `appSecret`/`clientSecret` 放进去意味着密钥可能随日志泄露。既然已经有 RSA 签名做请求认证,**再传 secret 是冗余且危险**的。

**建议**:请求认证只靠 RSA 签名,`appSecret`/`clientSecret` **移出请求参数**、仅后端保管;确需传密钥的接口走 POST 请求体 + HTTPS,并对日志脱敏。

---

### 问题 2:扫码登录是私有实现,而非设备授权流

**现状**:车机 / 手表扫码用私有 `qrcodekey/get/v2` + `device/login/qrcode/get` 轮询,状态用私有码 `800/801/802/803/804`,轮询还需"匿名 token"。

**标准怎么做**:输入受限设备扫码登录正是 [OAuth 2.0 设备授权流(RFC 8628)](https://datatracker.ietf.org/doc/html/rfc8628) 的场景——`device_code`/`user_code` + 标准 `authorization_pending`/`slow_down`/`access_denied`/`expired_token` 轮询语义。

**为什么是问题·风险**:私有端点与私有状态码无法复用标准设备流客户端库;而网易云现有的"取码 + 每 2~3s 轮询 + 状态机"与 RFC 8628 高度同构,只是换了私有外壳。

**建议**:扫码登录对齐 RFC 8628 的端点与轮询语义(含 `slow_down` 等)。

---

### 问题 3:H5 授权码流缺 PKCE、参数私有

**现状**:H5/唤端授权回调 `grantCode`(10 分钟)再换 token,是授权码流,但**无 PKCE**,参数私有(`grantCode`、`bizContent` JSON 打包)。

**标准怎么做**:[RFC 6749 §4.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1) 授权码流 + [RFC 7636 PKCE](https://datatracker.ietf.org/doc/html/rfc7636)([OAuth 2.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) 已将 PKCE 设为默认要求)。

**为什么是问题·风险**:H5 / 唤端回调可能经过前端或深链,`grantCode` 有被截获重放的面;缺 PKCE 就少了把授权码绑定到发起方的关键防护。

**建议**:换 token 只在后端进行(文档已建议);对内自建授权服务器时强制 PKCE。可用 [PKCE 工具](../tools/pkce.html) 自查。

---

### 问题 4:不是 OIDC,没有 `id_token`;身份是裸 `id`

**现状**:登录拿到的是不透明 `accessToken`,要身份还得再调 `profile/get/v2`;用户标识是一个裸 `id`(文档标注 `openId`/`unionId` 已失效),没有签名身份断言。

**标准怎么做**:[OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html#IDToken) 在登录时直接返回签名 `id_token`(JWT),含 `iss`/`aud`/`exp`/`iat`/`nonce` 与稳定的 `sub`,可离线验签。

**为什么是问题·风险**:没有 `id_token` 就没有可验证的身份断言——无法用签名确认"这份身份来自网易云、签发给我、未过期、与本次登录绑定",只能信任一次额外的 `profile` 调用;裸 `id` 也不具备 `aud`/`exp`/`nonce` 的受众绑定与防重放。

**建议**:如需 OIDC 语义,由你的网关在校验网易云回包后**补发标准 `id_token`**(`iss`/`aud`/`exp` + 回填 `nonce`),以内部稳定 `sub` 映射网易云 `id`,对内统一走 OIDC。

---

### 问题 5:结果码放在响应体,而非 HTTP 状态码

**现状**:统一响应外壳 `{code, subCode, message, data}`,用体内 `code`(`200` 成功、`400`/`500` 异常、`1406/1407/1408` 令牌、`-444/-445/-446` 限流)表达结果。

**标准怎么做**:HTTP 状态码是协议层结果信号([RFC 9110 §15](https://datatracker.ietf.org/doc/html/rfc9110#section-15));OAuth 错误另有机读 `error` 枚举([RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2)),现代 HTTP API 用 [Problem Details(RFC 9457)](https://datatracker.ietf.org/doc/html/rfc9457)。

**为什么是问题·风险**:体内 `code` 与 HTTP 状态双轨,网关 / 监控依 HTTP 状态做限流、熔断、告警会误判;`code` 值域私有,标准错误处理逻辑无法复用(如 `invalid_grant`/`invalid_client`)。

**建议**:HTTP 状态码承载结果,体内补细节;错误对齐 RFC 6749 §5.2 或 RFC 9457。你侧封装层可把 `code` 翻译成标准 `error` 语义。

---

### 问题 6:无发现文档 / JWKS,公钥手工上传

**现状**:端点写死,RSA 公钥靠手工上传控制台;没有机读发现文档,也没有 JWKS。

**标准怎么做**:[OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) / [RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414) 暴露端点与 `jwks_uri`,密钥可自动发现、自动轮换。

**为什么是问题·风险**:端点变更要改代码;公钥手工上传使轮换成为人工事故点,无法像 JWKS 那样自动同步。

**建议**:提供标准发现文档 + JWKS URI,让端点与验签公钥可自动发现、自动轮换。

---

## 改造建议(按优先级)

1. **secret 移出请求参数(最高优先级)**:请求认证只靠 RSA 签名,`appSecret`/`clientSecret` 仅后端保管、不进 URL/查询串。对应 [RFC 6749 §2.3](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3) 与 [RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700)。
2. **HTTP 状态码用对**:结果用 2xx/4xx/5xx,错误对齐 [RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2) 或 [RFC 9457](https://datatracker.ietf.org/doc/html/rfc9457)。
3. **扫码 / H5 对齐标准流程**:扫码走 [RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628),授权码加 [PKCE](https://datatracker.ietf.org/doc/html/rfc7636)。
4. **补齐 OIDC 语义**:补发签名 `id_token`,身份用稳定 `sub`(映射网易云 `id`)。
5. **提供 Discovery + JWKS**:端点与公钥可自动发现、可轮换。

> 网易云的**架构方向已对**(用户直登 + 令牌生命周期 + 非对称签名),改造多是"把私有细节对齐标准"。三家横向看:**网易云 > QQ 音乐 > 喜马拉雅**(离标准由近到远)。

## 参考标准

- [RFC 6749 — OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)(授权码 [§4.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1)、客户端凭据 [§2.3](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3)、错误 [§5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2))· [RFC 6750 — Bearer](https://datatracker.ietf.org/doc/html/rfc6750)
- [RFC 8628 — 设备授权流](https://datatracker.ietf.org/doc/html/rfc8628) · [RFC 7636 — PKCE](https://datatracker.ietf.org/doc/html/rfc7636) · [OAuth 2.1 draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) · [RFC 9700 — 安全 BCP](https://datatracker.ietf.org/doc/html/rfc9700)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) · [OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) · [RFC 8414 — 授权服务器元数据](https://datatracker.ietf.org/doc/html/rfc8414)
- [RFC 7519 — JWT](https://datatracker.ietf.org/doc/html/rfc7519) · [RFC 7515 — JWS](https://datatracker.ietf.org/doc/html/rfc7515)
- [RFC 9110 — HTTP 语义(状态码 §15)](https://datatracker.ietf.org/doc/html/rfc9110#section-15) · [RFC 9457 — Problem Details](https://datatracker.ietf.org/doc/html/rfc9457)

**相关文档**

- [网易云音乐登录对接实现](./netease-music.md) · [QQ 音乐评价](./qqmusic-review.md) · [喜马拉雅评价](./ximalaya-review.md)(三家横向对比)
- [OAuth 2.0 文档](../oauth2/) · [OpenID Connect 文档](../oidc/)
