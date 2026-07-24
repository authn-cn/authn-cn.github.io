---
title: "喜马拉雅车载 SDK 账户互通:与 OIDC/OAuth2 标准的差距"
---

# 喜马拉雅车载 SDK「账户互通」评测:哪里不符合 OIDC / OAuth 2.0

本页以喜马拉雅《车载 SDK 账户互通》文档(版本 1.0.6.0)为对象,**逐项**对照 OAuth 2.0 / OpenID Connect(OIDC)标准,指出其设计偏离标准之处,并给出应当改成的标准接口形态。每一项都附上对应的 RFC / 规范条款链接,便于直接与喜马技术方对齐。

> 评测依据的原文见:喜马拉雅车载 SDK 文档 →「账户」→「账户互通」。核心接口为 Android 端 `IXmCarAdvanceAPI` 上的 `loginByThird` / `bindThirdAccount` / `unbindThirdAccount` / `getThirdAccountBoundState`,外加合作方需实现的「第三方账户信息验证接口」。

::: tip 一句话结论
喜马的「账户互通」在**做一件标准早就定义好的事**——用车主自己的账号联合登录(federated login)到喜马账户——却几乎没有采用任何标准构件:**没有 ID Token、没有 Access Token、没有签名、没有标准 UserInfo 端点、没有发现文档,连 HTTP 状态码都用错**。它把本应是「令牌 + 验签」的离线可校验模型,退化成了「透传一坨不透明 `body` + 同步回调合作方私有接口」的强耦合模型。建议整体改造为标准 OIDC 联合登录 + 设备授权流(RFC 8628)。
:::

## 场景在标准里叫什么

先把角色对齐,后面所有结论都基于此:

| 现实角色 | 标准角色 | 职责 |
|---|---|---|
| 车厂 TSP / 云端(车主账号体系) | **OpenID Provider(OP / IdP)** | 签发身份令牌、暴露 UserInfo |
| 喜马拉雅云端 | **Relying Party(RP / 依赖方)** | 校验令牌、按 `sub` 建立/查询绑定 |
| 车机 App(SDK 宿主) | **Client**(设备端) | 取得令牌并递交给喜马 |
| 车主 | **End-User** | 已登录车机 |

也就是说:**车主已经登录了车机 → 车机 App 应当从车厂 OP 拿到车主的 `id_token` + `access_token` → 递交给喜马 → 喜马云端离线验签 `id_token`,必要时用 `access_token` 调车厂的 `UserInfo` 端点补充信息 → 用 `sub` 作为「第三方 uid」建立绑定。** 这正是你(合作方)描述的标准姿势,也是本文的评测基线。

标准这么设计的目的:RP(喜马)**不需要在每次登录时同步回调你的私有接口**,只要缓存你的 JWKS 公钥就能离线验签,登录不再依赖你公网接口的可用性与时延。

## 标准应该长什么样(基线流程)

```
车机 App(Client)         车厂 TSP(OpenID Provider)        喜马云端(RP)
   │  ① 设备授权流登录            │                                │
   │   RFC 8628 / 或 授权码+PKCE  │                                │
   │ ─────────────────────────►  │                                │
   │  ② 拿到 id_token +          │                                │
   │     access_token(令牌端点)  │                                │
   │ ◄─────────────────────────  │                                │
   │  ③ 把 id_token 递交给喜马 ───────────────────────────────────► │
   │                             │      ④ 用 JWKS 离线验签 id_token │
   │                             │        (iss/aud/exp/nonce 校验) │
   │                             │ ◄── ⑤(可选)Bearer access_token │
   │                             │      调 /userinfo 补充 claim ──► │
   │                             │        UserInfo 端点             │
   │                             │ ───────────────────────────────►│
   │  ⑥ 绑定成功(sub 作三方uid)◄───────────────────────────────── │
```

- **②** 令牌端点:OAuth 2.0 令牌端点,[RFC 6749 §3.2](https://datatracker.ietf.org/doc/html/rfc6749#section-3.2);`id_token` 是 JWT([RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519))、经 JWS 签名([RFC 7515](https://datatracker.ietf.org/doc/html/rfc7515))。
- **④** 验签:[OIDC Core §3.1.3.7 ID Token 校验](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation);公钥经 JWKS 分发([OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html))。
- **⑤** UserInfo:[OIDC Core §5.3](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo),用 `Authorization: Bearer <access_token>`([RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750))。

## 逐项问题

### 问题 1:根本没有「令牌」这个概念,只有一坨不透明的 `body`

**现状**:所有接口(`loginByThird` / `bind` / `unbind` / `getBoundState`)第二个参数都是 `String body`——文档描述为「调用第三方账号获取接口的入参报文(JSON 格式),调用第三方接口时会透传过去」。它的结构完全未定义,喜马不解析、也无法解析。

**标准怎么做**:身份信息应承载在 **ID Token**(JWT)里——一个结构化、带签名、带标准声明(claim)的令牌。见 [OIDC Core §2 ID Token](https://openid.net/specs/openid-connect-core-1_0.html#IDToken) 与 [RFC 7519 JWT](https://datatracker.ietf.org/doc/html/rfc7519)。

**为什么是问题**:不透明 `body` 意味着——
- 喜马**无法独立判断这个用户是谁、是否真实**,只能把球踢回给你的接口;
- 没有任何标准字段(`iss` / `sub` / `aud` / `exp` / `iat`),下面问题 4、5、6 全部由此派生;
- 两端对 `body` 结构的约定只能靠邮件和口头,无法用规范约束。

**建议**:把 `body` 换成 `id_token`(必要时加 `access_token`)。喜马侧从「透传一个黑盒」升级为「校验一个标准 JWT」。

---

### 问题 2:「第三方账户信息验证接口」是在手搓一个残缺版 UserInfo 端点

**现状**:合作方要实现一个公网 `POST application/json` 接口,喜马把 `body` 透传过来,返回 `third_uid`。这实质是「喜马问车厂:这个用户是谁」——也就是 **UserInfo**。但它是私有形状:自定义 URL、自定义入参、自定义返回。

**标准怎么做**:这正是 [OIDC UserInfo 端点(OIDC Core §5.3)](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo) 的职责。RP 用 `Authorization: Bearer <access_token>`([RFC 6750 §2.1](https://datatracker.ietf.org/doc/html/rfc6750#section-2.1))访问,端点返回标准 claim(`sub`、`name`、`email`…)。

**为什么是问题**:
- 没有 Bearer 令牌鉴权(见问题 3、4),端点靠「URL 保密」自我保护,等于裸奔;
- 返回字段 `third_uid` 是私有命名,而标准里稳定用户标识就是 `sub`([OIDC Core §2](https://openid.net/specs/openid-connect-core-1_0.html#IDToken));
- 大量场景根本不需要这个同步回调——如果用 `id_token`,喜马离线验签即可拿到 `sub`,无需每次打你的接口。

**建议**:若保留「喜马回调车厂」这一步,请把它实现为**标准 UserInfo 端点** + Bearer 令牌;并优先支持「喜马直接验签 `id_token`」以省掉这次网络往返。

---

### 问题 3:验证接口用 body 里的 `"code": 200 / 500` 表达结果——误用 HTTP 状态码

**现状**:验证接口的返回是

```json
正确:{ "code": 200, "third_uid": "xxxxx" }
异常:{ "code": 500, "msg": "该用户不存在", "third_uid": null }
```

也就是**把 `200`/`500` 塞进 JSON 正文的 `code` 字段**。这几乎必然意味着无论成功失败,HTTP 响应行都是 `200 OK`,真正的语义被埋进 body。

**标准怎么做**:HTTP 状态码是**协议层**的结果信号,由 [RFC 9110 §15](https://datatracker.ietf.org/doc/html/rfc9110#section-15) 精确定义:
- 成功用 `200 OK`([§15.3.1](https://datatracker.ietf.org/doc/html/rfc9110#section-15.3.1));
- 客户端错误用 `4xx`([§15.5](https://datatracker.ietf.org/doc/html/rfc9110#section-15.5)),如「用户不存在」应是 `404`/`400`,「令牌无效」应是 `401`;
- 服务端错误才用 `5xx`([§15.6](https://datatracker.ietf.org/doc/html/rfc9110#section-15.6)),`500` 表示「你自己的服务器炸了」——把「该用户不存在」这种正常业务结果标成 `500` 是语义错误。

**为什么是问题**:
- 「该用户不存在」是**客户端/业务**问题,不是**服务端故障**,却回了 `500`——监控、网关、重试策略会据 HTTP 状态判断,`500` 会触发无意义的告警与重试;
- body 内自定义 `code` 与 HTTP 状态**双轨制**,中间的负载均衡、CDN、代理无法据此正确处理(限流、熔断、缓存都看 HTTP 状态);
- 这是典型的「用 HTTP 当纯管道、语义全塞 body」的反模式(SOAP 时代遗风)。

**标准里的错误返回长什么样**:OAuth 2.0 的错误响应用 HTTP `400`/`401` + 机读 `error` 码([RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2));令牌类错误还要带 `WWW-Authenticate` 头([RFC 6750 §3](https://datatracker.ietf.org/doc/html/rfc6750#section-3))。通用 HTTP API 的现代做法是 **Problem Details for HTTP APIs([RFC 9457](https://datatracker.ietf.org/doc/html/rfc9457))**:HTTP 状态给对,body 里再用 `type`/`title`/`detail` 补充。

**建议**:让 HTTP 状态码承载结果(2xx/4xx/5xx),body 用于**细节**而非**结果**;错误对齐 RFC 6749 §5.2 或 RFC 9457。

---

### 问题 4:回调链路没有任何签名 / 完整性 / 来源认证

**现状**:喜马云端**从公网**调你的验证接口,只带一个透传 `body`。文档全篇**未提任何签名、时间戳、mTLS、请求方认证**。反过来,喜马拿到的 `body` 也没有签名,无法判断它是否被伪造或重放。

**标准怎么做**:
- 身份令牌是 **JWS 签名的 JWT**([RFC 7515](https://datatracker.ietf.org/doc/html/rfc7515) / [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)),RP 用签发方公钥验签,伪造不了;
- 公钥经 **JWKS** 分发,RP 缓存即可离线校验([OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html));
- 服务器间调用另可叠加 **mTLS**([RFC 8705](https://datatracker.ietf.org/doc/html/rfc8705))或私有签名头。

**为什么是问题**:
- 你的验证接口只靠「URL 不外泄」保护——一旦 URL 泄露,任何人都能构造 `body` 探测/伪造用户;
- 喜马无法证明收到的 `body` 真的来自车主本人授权,存在**令牌注入 / 重放**风险;
- 缺 `exp`(见问题 5),即使截获也永久有效。

**建议**:改用签名 JWT + JWKS;如需保留回调,给回调加请求签名或 mTLS,并校验来源。

---

### 问题 5:`third_uid` 是裸字符串,缺失全部安全声明(`iss`/`aud`/`exp`/`iat`/`nonce`)

**现状**:身份仅由一个 `third_uid` 字符串代表。没有签发者、没有受众、没有过期时间。

**标准怎么做**:ID Token 的必备 claim 见 [OIDC Core §2](https://openid.net/specs/openid-connect-core-1_0.html#IDToken),校验规则见 [§3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation):

| Claim | 作用 | 缺失后果 |
|---|---|---|
| `iss` | 签发方 | 不知道令牌来自哪个车厂 OP |
| `sub` | 稳定用户标识 | (对应 `third_uid`,但应由签名保护) |
| `aud` | 受众 = 喜马的 client_id | **令牌可被复用到其它 RP**(缺受众绑定) |
| `exp` | 过期时间 | **令牌永久有效**,截获即长期可用 |
| `iat` | 签发时间 | 无法判断新鲜度 |
| `nonce` | 防重放,绑定本次登录 | **可重放**([OIDC Core §15.5.2](https://openid.net/specs/openid-connect-core-1_0.html#NonceNotes)) |

**为什么是问题**:缺 `aud` → 一个车厂签出的凭据可被拿去别处冒用;缺 `exp`/`nonce` → 重放攻击无成本。这些不是可选优化,是 OIDC 的**强制校验项**。

**建议**:三方标识用 `sub`(issuer 作用域内唯一),并置于签名 JWT 内,连同 `iss`/`aud`/`exp`/`iat`/`nonce` 一并下发与校验。

---

### 问题 6:车机「扫码登录」其实就是标准的设备授权流(RFC 8628),却自造了私有实现

**现状**:未绑定时,文档要求「车机端 APK 调用喜马 SDK 的扫码登录能力」,这是喜马私有的扫码机制。

**标准怎么做**:车机这类**输入受限设备**(没有键盘/浏览器友好输入)扫码登录,正是 **OAuth 2.0 Device Authorization Grant([RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628))** 的设计目标场景(与智能电视、机顶盒同类)。设备拿 `device_code` + `user_code`,用户在手机上确认,设备轮询令牌端点拿到令牌。

**为什么是问题**:自造扫码协议 = 无法复用标准库、无法被审计、每家车厂都要重新理解喜马的私有流程。而设备流是 IETF 正式标准,主流 IdP(Auth0、Keycloak、Okta…)开箱即用。

**建议**:车厂 OP 侧的扫码登录用 RFC 8628 实现;若车机有 WebView,则用授权码 + PKCE([RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636))。

---

### 问题 7:没有发现文档 / 元数据,全靠邮件手工对接

**现状**:接入靠给 `rui5.wang@ximalaya.com` 发邮件申请 `thirdAppId`,URL(测试/正式)在邮件正文里手填。

**标准怎么做**:
- [OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html):OP 暴露 `/.well-known/openid-configuration`,自动声明授权/令牌/UserInfo/JWKS 端点与支持的算法;
- [RFC 8414 OAuth Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414):OAuth 版同类元数据。

**为什么是问题**:手工填 URL → 环境切换易错、端点变更需重新发邮件、无法程序化对接、密钥轮换(JWKS 本可自动同步)变成人工事故点。

**建议**:车厂 OP 提供标准 discovery 文档 + JWKS URI,喜马按 URL 自动读取端点与公钥。

---

### 问题 8:`thirdAppId` 只是标识符,缺客户端认证与注册规范

**现状**:`thirdAppId` 是账户互通的客户标识,无配套密钥,也无标准注册流程。

**标准怎么做**:OAuth 客户端有 `client_id` + `client_secret`(或非对称密钥 / mTLS)做**客户端认证**([RFC 6749 §2.3](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3));注册可走 [RFC 7591 动态客户端注册](https://datatracker.ietf.org/doc/html/rfc7591)。`aud` claim 应等于 `client_id`,把令牌**绑定到喜马这一个客户端**。

**建议**:`thirdAppId` 对应到 `client_id`,并补客户端认证;令牌 `aud` 绑定该 client。

---

### 问题 9:错误语义混淆——把「正常业务状态」当「远程错误」

**现状**:`loginByThird` 与 `bindThirdAccount` 文档写:「已绑定为 `CODE_SUCCESS`,未绑定为 `CODE_REMOTE_ERROR`」。也就是**「未绑定」这个完全正常、预期内的状态,被表示为「远程错误」**。

**标准怎么做**:「尚未认证/未授权」是有专门语义的**正常结果**,不是传输错误。OAuth 用明确的 `error` 枚举(如 `access_denied`、`invalid_grant`),见 [RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2);OIDC 认证错误见 [OIDC Core §3.1.2.6](https://openid.net/specs/openid-connect-core-1_0.html#AuthError)。

**为什么是问题**:调用方无法区分「用户没绑定(该引导去扫码)」和「喜马服务/网络真的出错了(该重试/告警)」——两者都回 `CODE_REMOTE_ERROR`,处理逻辑无从下手。

**建议**:为「未绑定」设独立的、非错误的状态码,与真正的远程/传输错误区分开。

---

### 问题 10:`msg` 只有中文自由文本,没有机读错误码

**现状**:异常返回 `"msg": "该用户不存在"`——人读的中文串,无机读枚举。

**标准怎么做**:[RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2) 定义了**枚举**的 `error` 码集合(`invalid_request`、`invalid_client`、`invalid_grant`…),`error_description` 才是给人看的补充;RFC 9457 用稳定的 `type` URI 标识错误类别。

**为什么是问题**:客户端要靠 `msg` 文案做分支就只能字符串匹配,文案一改逻辑就崩;也无法国际化。

**建议**:提供稳定机读 `error` 码,`msg` 仅作人类可读补充。

---

### 问题 11:同步回调造成运行时强耦合,放大攻击面与时延

**现状**:每次登录/绑定,喜马都要**同步**打一次你的公网验证接口。你的接口一旦抖动/宕机,喜马侧登录直接失败。

**标准怎么做**:令牌离线验签模型下,RP 只需**缓存 JWKS 公钥**即可校验,登录不依赖 OP 的实时可用性;需要吊销时才用 [RFC 7662 令牌内省](https://datatracker.ietf.org/doc/html/rfc7662) 或 [RFC 7009 令牌吊销](https://datatracker.ietf.org/doc/html/rfc7009) 按需查询。

**为什么是问题**:把「验证」做成每次同步回调 = 你的公网接口成为登录链路的硬依赖 + 新增公网攻击面 + 每次登录多一跳网络时延。

**建议**:默认离线验签;仅在需要实时吊销状态时才回调,并走标准内省接口。

---

## 术语与做法对照表

| 喜马现状 | 标准对应 | 依据 |
|---|---|---|
| 不透明 `body`(String) | `id_token`(签名 JWT) | [OIDC Core §2](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)、[RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519) |
| 「第三方账户信息验证接口」 | UserInfo 端点 + Bearer | [OIDC Core §5.3](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)、[RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750) |
| `third_uid`(裸串) | `sub` claim(签名保护) | [OIDC Core §2](https://openid.net/specs/openid-connect-core-1_0.html#IDToken) |
| body 内 `"code":200/500` | HTTP 状态码 2xx/4xx/5xx | [RFC 9110 §15](https://datatracker.ietf.org/doc/html/rfc9110#section-15) |
| `msg`(中文文本) | 机读 `error` + `error_description` | [RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2)、[RFC 9457](https://datatracker.ietf.org/doc/html/rfc9457) |
| 私有「扫码登录能力」 | 设备授权流 Device Grant | [RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628) |
| 邮件申请 URL / `thirdAppId` | Discovery 文档 + `client_id` | [OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html)、[RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414)、[RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591) |
| 无签名的公网回调 | JWS 验签 + JWKS(+ mTLS) | [RFC 7515](https://datatracker.ietf.org/doc/html/rfc7515)、[RFC 8705](https://datatracker.ietf.org/doc/html/rfc8705) |
| bind / unbind(私有) | 联合登录 + 账户关联(必要时 Token Exchange) | [RFC 8693](https://datatracker.ietf.org/doc/html/rfc8693) |
| 「未绑定 = `CODE_REMOTE_ERROR`」 | 独立的未认证/未授权状态 | [OIDC Core §3.1.2.6](https://openid.net/specs/openid-connect-core-1_0.html#AuthError) |

## 推荐的标准化改造方案

给喜马的最小改造建议(按优先级):

1. **引入 ID Token**:车机递交 `id_token`(签名 JWT)给喜马,喜马用 JWKS **离线验签**并校验 `iss`/`aud`/`exp`/`nonce`。以 `sub` 取代 `third_uid` 作为三方唯一标识。——一举解决问题 1、4、5,并让问题 11 的同步回调变为可选。
2. **HTTP 状态码用对**:验证/绑定接口成功回 `2xx`,业务失败回对应 `4xx`,服务故障才 `5xx`;错误体对齐 [RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2) 或 [RFC 9457](https://datatracker.ietf.org/doc/html/rfc9457)。——解决问题 3、10。
3. **回调即 UserInfo**:若保留「喜马问车厂」,把它实现为标准 [UserInfo 端点](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo) + `Authorization: Bearer`。——解决问题 2。
4. **扫码走设备授权流**:车厂 OP 侧用 [RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628) 实现扫码登录。——解决问题 6。
5. **提供 Discovery + JWKS**:让端点与公钥可自动发现、可轮换。——解决问题 7、8。
6. **区分「未绑定」与「远程错误」**:给未绑定单独状态。——解决问题 9。

> 若喜马短期内无法全量改造,**最有价值的单点改动是第 1、2 两条**:用签名 `id_token` 取代不透明 `body`(安全性质变),以及把 HTTP 状态码用对(可运维性质变)。

## 参考标准

**OAuth 2.0 / 2.1**

- [RFC 6749 — The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)(错误响应见 [§5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2))
- [RFC 6750 — Bearer Token Usage](https://datatracker.ietf.org/doc/html/rfc6750)
- [RFC 8628 — Device Authorization Grant](https://datatracker.ietf.org/doc/html/rfc8628)
- [RFC 7636 — PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 8414 — Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)
- [RFC 7591 — Dynamic Client Registration](https://datatracker.ietf.org/doc/html/rfc7591)
- [RFC 7662 — Token Introspection](https://datatracker.ietf.org/doc/html/rfc7662) · [RFC 7009 — Token Revocation](https://datatracker.ietf.org/doc/html/rfc7009)
- [RFC 8693 — Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693) · [RFC 8705 — mTLS Client Auth](https://datatracker.ietf.org/doc/html/rfc8705)
- [OAuth 2.1(draft)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)

**OpenID Connect**

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)(ID Token [§2](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)、校验 [§3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)、UserInfo [§5.3](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo))
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)

**JOSE / JWT**

- [RFC 7519 — JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519) · [RFC 7515 — JSON Web Signature (JWS)](https://datatracker.ietf.org/doc/html/rfc7515) · [RFC 7517 — JSON Web Key (JWK)](https://datatracker.ietf.org/doc/html/rfc7517)

**HTTP**

- [RFC 9110 — HTTP Semantics](https://datatracker.ietf.org/doc/html/rfc9110)(状态码 [§15](https://datatracker.ietf.org/doc/html/rfc9110#section-15))
- [RFC 9457 — Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc9457)

**相关文档**

- [OAuth 2.0 文档](../oauth2/) · [OpenID Connect 文档](../oidc/) · [JWT / JOSE 文档](../jwt/)
- [企业微信扫码登录](./wecom.md) · [微信扫码登录](./wechat.md)
