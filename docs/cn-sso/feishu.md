---
title: "飞书 SSO 对接实现"
---

# 飞书(Feishu)SSO 对接实现

本页只讲**怎么把飞书 SSO 落地对接**;至于飞书对 SAML/OIDC 标准的支持差距、限制与风险评价,见 [飞书标准差距评价](./feishu-review.md)。企业微信的对接见 [企业微信 SSO](./wecom.md)。

## 先分清两个方向

对接飞书 SSO 前,务必先确认你要做的是哪个方向——两者协议、配置位置、可用能力完全不同。

| 维度 | 方向 A:飞书作 **SP** | 方向 B:飞书作 **IdP** |
|------|----------------------|------------------------|
| 场景 | 用企业已有 IdP 登录**进飞书** | 用飞书账号登录**别的系统** |
| 支持协议 | **只支持 SAML 2.0** | SAML、OIDC、OAuth2 |
| 配置位置 | 管理后台 → 企业设置 → **SSO 账号登录** | 飞书**集成平台**(开放平台应用) |
| 版本要求 | 通常需**旗舰版** | 普通开发者应用即可 |
| 能否导入/下载元数据 | **不能**导入 IdP metadata,也**不提供** SP metadata 文件 | **能下载**元数据文档 |
| 本质 | 标准 SAML 2.0 Web SSO | OAuth2 授权码流 |

::: tip 一句话判断
"让员工用公司账号登飞书" → 方向 A(SAML);"让飞书用户登我们自己的系统" → 方向 B(OAuth2)。
:::

---

## 方向 A:飞书作 SP(SAML 2.0)

管理后台路径:**企业设置 → SSO 账号登录**。该界面**只有 SAML 一种选项**,没有 OIDC / OAuth2 / CAS。

### 关键约束

- 飞书**不支持导入 IdP metadata**,必须**手工逐项填写**下面三个字段。
- 证书要填**裸 base64**:去掉 `-----BEGIN CERTIFICATE-----` / `-----END CERTIFICATE-----` 头尾和换行,只留中间的 base64 正文。
- 证书是**写死的、需手动轮换**:一旦 IdP 侧轮换了签名证书而飞书这边没更新,登录会**突然全部失败**。

### 第一步:在飞书后台填 IdP 参数

在"SSO 账号登录"里手动填这三项(来自你的 IdP metadata):

| 飞书字段 | 含义 | 来自 IdP metadata 的哪里 |
|----------|------|--------------------------|
| 登录地址(SSO URL) | IdP 的单点登录端点 | `<SingleSignOnService Binding="HTTP-Redirect/POST">` 的 `Location` |
| Issuer / Entity ID | IdP 的实体标识 | `<EntityDescriptor entityID="...">` |
| 签名证书 | IdP 签名断言用的公钥证书 | `<X509Certificate>`(**去头尾、裸 base64**) |

::: tip 用工具省去手抄
把 IdP 的 metadata XML 丢给 [飞书 SAML SSO 助手](../tools/feishu-saml.html),它能直接解析出上面三个要手填的字段,并能反向生成飞书 SP metadata。证书去头尾也可以用 [证书处理工具](../tools/cert.html)。metadata 的通用解析见 [SAML metadata 工具](../tools/saml-metadata.html)。
:::

### 第二步:在 IdP 侧配置飞书这个 SP

飞书**不提供 SP metadata 文件**,但它的 SP 参数是**按区域固定的常量**(与你的企业无关),照区域填即可:

| 区域 | 域名 | ACS URL(Recipient / Destination) | SP Entity ID(Audience) |
|------|------|-------------------------------------|--------------------------|
| 飞书中国 | `*.feishu.cn` | `https://www.feishu.cn/suite/passport/authentication/idp/saml/call_back` | `https://www.feishu.cn` |
| Lark 国际 | `*.larksuite.com` | `https://www.larksuite.com/suite/passport/authentication/idp/saml/call_back` | `https://www.larksuite.com` |
| Lark 新加坡 | `*.sg.larksuite.com` | 按区域替换域名(`www.sg.larksuite.com`) | 按区域替换域名 |
| Lark 日本 | `*.jp.larksuite.com` | 按区域替换域名(`www.jp.larksuite.com`) | 按区域替换域名 |

要点:

- **ACS 绑定是 HTTP-POST**。在 Okta 里配置时勾选 **"Use this for Recipient URL and Destination URL"**。
- 企业域名(如 `xxx.feishu.cn`)只在**员工登录时输入**、用于路由到你的租户,**不出现在 SAML 端点里**——不要把它拼进 ACS / Entity ID。

### 第三步:配置断言属性(必做)

- **必须在 IdP 侧配置 `email` 属性**,值为用户邮箱。飞书**按邮箱匹配成员**,IdP 断言里的邮箱与飞书成员的邮箱**必须完全一致**。
- **NameID** 常用 `emailAddress` 格式。确保 IdP 断言的 NameID 与飞书成员对应字段一致,否则会出现"**登录成功但匹配不到人**"的现象。

```
员工输入企业域名 xxx.feishu.cn
        │  (仅用于路由到租户)
        ▼
飞书重定向到 IdP 登录地址(SSO URL)
        │
        ▼
IdP 认证 → 生成 SAML 断言(含 email 属性 + NameID)
        │  HTTP-POST
        ▼
飞书 ACS(区域固定 URL)验签(裸 base64 证书)
        │
        ▼
按 email / NameID 匹配飞书成员 → 登录成功
```

---

## 方向 B:飞书作 IdP(OAuth2 授权码)

用飞书账号登录你自己的系统,本质是 **OAuth2 授权码流**。在飞书**集成平台/开放平台**创建应用后可下载元数据文档。

### 流程图

```
浏览器/前端                你的后端                    飞书开放平台
    │                         │                            │
    │ 1. 跳转飞书授权页        │                            │
    │────────────────────────────────────────────────────▶│
    │                         │      用户同意授权           │
    │◀────────────────────────────────────────────────────│
    │ 2. 回调带 code           │                            │
    │────────────────────────▶│                            │
    │                         │ 3. app_id+app_secret       │
    │                         │    换 app/tenant_access_token
    │                         │───────────────────────────▶│
    │                         │ 4. 用 code + token          │
    │                         │    换 user_access_token     │
    │                         │───────────────────────────▶│
    │                         │ 5. 调 /authen/v1/user_info  │
    │                         │───────────────────────────▶│
    │                         │◀── open_id/union_id/邮箱等 ─│
    │ 6. 建立本地会话          │                            │
    │◀────────────────────────│                            │
```

### 后端换 token 步骤

| 步骤 | 输入 | 输出 |
|------|------|------|
| 1. 前端拿授权码 | 用户在飞书授权 | `code` |
| 2. 换应用凭证 token | `app_id` + `app_secret` | `app_access_token` / `tenant_access_token` |
| 3. 换用户 token | `code` + 应用凭证 token | `user_access_token` |
| 4. 拉用户信息 | `user_access_token` | 用户身份字段 |

用户信息接口:`/open-apis/authen/v1/user_info`。

### 关键字段

飞书的用户标识**以 `open_id` / `union_id` / `user_id` 为主**:

| 字段 | 说明 |
|------|------|
| `open_id` | 用户在**单个应用**内的唯一标识 |
| `union_id` | 用户在**同一开发者旗下多应用**间的统一标识 |
| `user_id` | 用户在**租户内**的标识 |

::: tip 本地账号映射
建议以 `union_id` 或 `open_id` 作为与本地账号绑定的主键,不要只依赖邮箱(邮箱可能为空或可变)。
:::

---

## 常见坑

::: warning 证书轮换会导致"某天突然全员登不上"
方向 A 的 IdP 签名证书在飞书是**写死的**。IdP 轮换证书后,必须**同步手动**更新飞书后台里的裸 base64 证书,否则验签失败、登录中断。把证书到期日纳入运维日历。
:::

::: warning 邮箱不一致 = 登录成功但匹配不到人
方向 A 靠 `email` 属性 / NameID 匹配成员。IdP 里的邮箱与飞书成员邮箱哪怕大小写或域名不同,都会匹配失败。上线前逐一核对。
:::

::: warning 旗舰版限制
方向 A(SSO 登录进飞书)通常需要**旗舰版**。低版本套餐在后台可能看不到"SSO 账号登录"入口,先确认版本再排期。
:::

其他易错点:

- 把区域搞错——中国用 `feishu.cn`,国际用 `larksuite.com`,ACS / Entity ID 常量不能混用。
- 证书没去头尾、带了 `-----BEGIN/END-----` 或换行,导致飞书解析失败。
- 误以为飞书能导入 IdP metadata 或提供 SP metadata——都不行,只能手填 + 用固定常量。

关于这些限制在标准层面意味着什么,详见 [飞书标准差距评价](./feishu-review.md)。SAML 协议本身参见 [SAML 2.0](../saml/),OAuth2/OIDC 参见 [OIDC](../oidc/)。

---

## 参考来源

- 飞书帮助中心 — SSO 账号登录配置:<https://www.feishu.cn/hc/zh-CN/articles/360043576234>
- 飞书帮助中心 — SAML 配置说明:<https://www.feishu.cn/hc/zh-CN/articles/360049067599>
- Lark Admin — Configure SAML 2.0 SSO login (Okta or Google),含各区域固定参数:<https://www.larksuite.com/hc/en-US/articles/360048487935-admin-configure-saml-2.0-sso-login-okta-or-google>
- 飞书开放平台 — 获取登录用户信息(方向 B `user_info`):<https://open.feishu.cn/document/common-capabilities/sso/api/get-user_info>
