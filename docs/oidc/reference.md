---
title: "典型参数与 Claims 参考"
---

# 典型参数与 Claims 参考

本页为速查表,流程语境见[典型流程](./flows.md),概念解释见[核心概念](./concepts.md)。

## 认证请求参数

发往 authorization endpoint 的参数(OIDC 视角,含 OAuth2 基础参数):

| 参数 | 必需性 | 说明 |
|------|--------|------|
| `scope` | 必需 | 空格分隔;**必须包含 `openid`**,否则就是普通 OAuth2 请求,不会返回 ID Token |
| `response_type` | 必需 | 决定 flow:`code`(推荐)/ `id_token` / `code id_token` 等 |
| `client_id` | 必需 | RP 在 OP 注册获得的客户端标识 |
| `redirect_uri` | 必需 | 回调地址,必须与注册值精确匹配(不允许通配) |
| `state` | 强烈建议 | 不透明随机值,回调时原样返回;RP 校验以防 CSRF,也可携带回跳路径等状态 |
| `nonce` | code flow 建议,implicit/hybrid 必需 | 随机值,OP 原样写入 ID Token 的 `nonce` claim;RP 校验以防重放 |
| `prompt` | 可选 | 控制 OP 交互行为,见下方 [prompt 取值表](#prompt-取值表) |
| `max_age` | 可选 | 认证最大有效秒数;若用户上次认证距今超过该值,OP 必须重新认证,并在 ID Token 返回 `auth_time` |
| `login_hint` | 可选 | 提示登录标识(如邮箱),OP 可预填登录框,常用于"已知用户是谁"的场景 |
| `acr_values` | 可选 | 期望的认证上下文等级(空格分隔、按优先级),如要求 MFA;结果体现在 ID Token 的 `acr` |
| `display` | 可选 | 期望的展示方式:`page` / `popup` / `touch` / `wap` |
| `ui_locales` | 可选 | 期望的界面语言,如 `zh-CN zh en` |
| `code_challenge` / `code_challenge_method` | 公共客户端必需 | PKCE 参数,`method` 用 `S256` |

## ID Token Claims

### 必需 claims

| Claim | 类型 | 说明 |
|-------|------|------|
| `iss` | string (URL) | 签发者,必须等于 OP 的 issuer |
| `sub` | string (≤255 ASCII) | 用户唯一标识,同一 OP 内稳定不复用;本地主键用 `iss + sub` |
| `aud` | string 或 array | 受众,必须包含 RP 的 client_id |
| `exp` | number | 过期时间(Unix 秒) |
| `iat` | number | 签发时间(Unix 秒) |

### 条件必需 / 可选 claims

| Claim | 何时出现 | 说明 |
|-------|----------|------|
| `nonce` | 请求带了 `nonce` 则必需 | 原样返回请求中的 nonce,RP 必须比对 |
| `auth_time` | 请求带 `max_age` 时必需,其余可选 | 用户实际认证时间 |
| `acr` | 可选 | 达到的认证上下文等级 |
| `amr` | 可选 | 认证方法数组,如 `["pwd","otp"]`、`["mfa"]` |
| `azp` | `aud` 多值时必需 | 实际被授权方的 client_id |
| `at_hash` | implicit/hybrid 同时返回 access_token 时必需 | access token 哈希左半段,防 token 替换 |
| `c_hash` | hybrid 返回 code 时必需 | 授权码哈希左半段 |
| `sid` | 可选 | OP 端会话 ID,Back-Channel Logout 按它定位 RP 会话 |

## 标准 Claims 一览(按 scope 分组)

这些 claims 出现在 UserInfo 响应或 ID Token 中:

### scope=profile

| Claim | 类型 | 说明 |
|-------|------|------|
| `name` | string | 全名(展示用) |
| `given_name` | string | 名 |
| `family_name` | string | 姓 |
| `middle_name` | string | 中间名 |
| `nickname` | string | 昵称 |
| `preferred_username` | string | 首选用户名;**可能变化且可能重复,不能当主键** |
| `picture` | string (URL) | 头像地址 |
| `profile` | string (URL) | 个人主页 |
| `website` | string (URL) | 个人网站 |
| `gender` | string | 性别 |
| `birthdate` | string | 生日,`YYYY-MM-DD` 或 `YYYY`(`0000` 表示仅提供月日) |
| `zoneinfo` | string | 时区,如 `Asia/Shanghai` |
| `locale` | string | 区域,如 `zh-CN` |
| `updated_at` | number | 资料最后更新时间(Unix 秒) |

### scope=email

| Claim | 类型 | 说明 |
|-------|------|------|
| `email` | string | 邮箱 |
| `email_verified` | boolean | 邮箱是否经 OP 验证;**做邮箱匹配的业务逻辑前必须检查它为 true** |

### scope=phone

| Claim | 类型 | 说明 |
|-------|------|------|
| `phone_number` | string | 电话,建议 E.164 格式,如 `+8613800138000` |
| `phone_number_verified` | boolean | 是否经验证 |

### scope=address

| Claim | 类型 | 说明 |
|-------|------|------|
| `address` | JSON object | 含 `formatted`、`street_address`、`locality`、`region`、`postal_code`、`country` 子字段 |

## Discovery 文档关键字段

`/.well-known/openid-configuration` 中 RP 最常用的字段:

| 字段 | 说明 |
|------|------|
| `issuer` | OP 标识,必须与请求该文档所用的 issuer 一致,也是 ID Token `iss` 的预期值 |
| `authorization_endpoint` | 认证/授权端点 |
| `token_endpoint` | 令牌端点 |
| `userinfo_endpoint` | 用户信息端点 |
| `jwks_uri` | 公钥集(JWKS)地址 |
| `end_session_endpoint` | RP-Initiated Logout 端点(RP-Initiated Logout 规范定义) |
| `registration_endpoint` | 动态客户端注册端点(如支持) |
| `scopes_supported` | 支持的 scope 列表 |
| `response_types_supported` | 支持的 response_type |
| `subject_types_supported` | `public` / `pairwise` |
| `id_token_signing_alg_values_supported` | ID Token 签名算法,RP 据此设白名单 |
| `token_endpoint_auth_methods_supported` | token 端点客户端认证方式,如 `client_secret_basic`、`private_key_jwt` |
| `claims_supported` | 可返回的 claims 列表(信息性) |
| `code_challenge_methods_supported` | 支持的 PKCE 方法,应含 `S256` |
| `frontchannel_logout_supported` / `backchannel_logout_supported` | 是否支持前端/后端通道登出 |

## prompt 取值表

| 取值 | 行为 | 典型用途 |
|------|------|----------|
| `none` | OP 不得展示任何交互界面;无活跃会话或需交互时直接返回错误(如 `login_required`) | 静默检查登录态 / SSO 探测 / token 续期 |
| `login` | 强制重新认证,即使已有会话 | 敏感操作前二次确认身份(step-up) |
| `consent` | 强制重新展示授权确认页 | 需要用户重新授予权限 |
| `select_account` | 展示账号选择界面 | 用户有多账号,允许切换 |

`prompt` 可组合(如 `login consent`),但 `none` 不能与其他值同用。

## OIDC 新增错误码

在 OAuth2 错误码(`invalid_request`、`access_denied`、`invalid_grant` 等,见 [OAuth2 文档](../oauth2/))之外,OIDC 在授权端点新增:

| 错误码 | 含义 | 常见触发 |
|--------|------|----------|
| `login_required` | 需要用户登录,但不允许交互 | `prompt=none` 且 OP 无活跃会话 |
| `consent_required` | 需要用户授权确认,但不允许交互 | `prompt=none` 且该客户端未获同意 |
| `interaction_required` | 需要某种用户交互,但不允许交互 | `prompt=none` 的兜底错误 |
| `account_selection_required` | 需要用户选择账号,但不允许交互 | `prompt=none` 且存在多账号会话 |
| `invalid_request_uri` | `request_uri` 无法获取或内容非法 | 使用 PAR/request_uri 的场景 |
| `invalid_request_object` | request 对象(JWT)非法 | 使用签名请求对象(JAR)的场景 |
| `request_not_supported` / `request_uri_not_supported` | OP 不支持 request(_uri) 参数 | 能力不匹配 |
| `registration_not_supported` | OP 不支持 registration 参数 | 能力不匹配 |

::: tip
`login_required` 是正常信号而非故障:静默续期(`prompt=none`)收到它,应回退为一次带交互的常规登录。
:::

## 排错速查表

| 现象 | 常见原因 |
|------|----------|
| 回调报 `redirect_uri_mismatch` / `invalid_request` | redirect_uri 与注册值不完全一致(协议、端口、末尾斜杠、大小写) |
| token 响应里没有 `id_token` | 请求的 `scope` 漏了 `openid` |
| ID Token 校验失败:`iss` 不匹配 | issuer 配置带/不带末尾斜杠不一致;多租户 OP 用错了租户 URL |
| ID Token 校验失败:签名无效 / 找不到 `kid` | JWKS 缓存过期(OP 已轮换密钥),需刷新 JWKS;或环境配错拿了别的 OP 的 JWKS |
| ID Token 校验失败:`aud` 不匹配 | 用了别的应用的 client_id;或把发给其他客户端的 token 拿来验证 |
| nonce 校验失败 | 会话丢失(回调落在另一实例且 session 未共享)、Cookie 的 SameSite 设置导致回调请求不带会话 Cookie |
| `invalid_grant`(换 token 失败) | 授权码已使用/过期(码只能用一次,注意浏览器预取或重复回调);PKCE `code_verifier` 与 `code_challenge` 不匹配;redirect_uri 与授权请求时不一致 |
| `prompt=none` 总是返回 `login_required` | OP 无会话(第三方 Cookie 被浏览器拦截是常见根因);或 OP 侧要求重新同意 |
| 登出后刷新又是登录态 | 只清了 RP 会话没跳 `end_session_endpoint`,被 OP 的 SSO 会话静默重登 |
| 登出后没有跳回应用 | `post_logout_redirect_uri` 未在 OP 侧登记,或未携带 `id_token_hint` 导致 OP 无法关联客户端 |
| 拿不到 email/name 等 claims | 未申请对应 scope;或该 OP 只在 UserInfo 返回这些 claims 而 RP 只解析了 ID Token |
| 时好时坏的 `exp`/`iat` 校验失败 | 服务器时钟漂移,配置 NTP 并允许 ≤5 分钟 clock skew |
