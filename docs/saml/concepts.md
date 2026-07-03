---
title: "核心概念"
---

# 核心概念

本页自底向上梳理 SAML 2.0 的概念体系:角色 → Assertion → Protocol → Binding → Profile → Metadata,以及贯穿始终的 NameID、RelayState 和 XML 签名/加密。

## 角色

| 角色 | 说明 |
|------|------|
| **Principal**(主体) | 被认证的实体,通常就是使用浏览器的最终用户 |
| **IdP**(Identity Provider,身份提供者) | 负责认证 Principal 并签发 Assertion 的一方,如 Keycloak、AD FS、Okta、Azure AD |
| **SP**(Service Provider,服务提供者) | 消费 Assertion、向用户提供业务服务的一方,即"依赖方"应用 |

每个 IdP 和 SP 都用一个全局唯一的 **Entity ID**(通常是一个 URI,如 `https://sp.example.com/saml/metadata`)标识自己,协议消息中的 `<Issuer>` 元素填的就是它。SP 与 IdP 建立信任的过程,本质上是**互相登记对方的 Entity ID、端点 URL 和签名证书**(见下文 Metadata)。

## Assertion(断言)

Assertion 是 IdP 签发的一份 XML 声明文档,是整个协议中真正承载"身份事实"的载体。一个 Assertion 主要包含:

- `<Issuer>`:签发者(IdP 的 Entity ID);
- `<Subject>`:关于谁(含 NameID 和 SubjectConfirmation);
- `<Conditions>`:生效条件(有效期 `NotBefore`/`NotOnOrAfter`、受众限制 `<AudienceRestriction>`);
- 一个或多个 **Statement**(声明)。

三种 Statement:

| Statement | 元素 | 内容 | 实战使用频率 |
|-----------|------|------|-------------|
| 认证声明 | `<AuthnStatement>` | 主体在何时(`AuthnInstant`)、以何种方式(`AuthnContextClassRef`,如密码、MFA)完成了认证;会话索引 `SessionIndex` | 几乎总是存在 |
| 属性声明 | `<AttributeStatement>` | 主体的属性键值对,如 email、displayName、所属组 | 非常常用 |
| 授权决策声明 | `<AuthzDecisionStatement>` | 对"主体能否对某资源执行某动作"的裁决(Permit/Deny) | 规范中已标注冻结(deprecated 方向),实战几乎不用,授权一般交给 XACML 或应用自身 |

一个精简的 Assertion 骨架:

```xml
<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="_a1b2c3d4" Version="2.0" IssueInstant="2026-07-03T08:30:00Z">
  <saml:Issuer>https://idp.example.org/saml/metadata</saml:Issuer>
  <!-- ds:Signature 通常在这里 -->
  <saml:Subject>
    <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
      alice@example.org
    </saml:NameID>
    <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
      <saml:SubjectConfirmationData Recipient="https://sp.example.com/saml/acs"
          NotOnOrAfter="2026-07-03T08:35:00Z" InResponseTo="_req001"/>
    </saml:SubjectConfirmation>
  </saml:Subject>
  <saml:Conditions NotBefore="2026-07-03T08:29:30Z" NotOnOrAfter="2026-07-03T08:35:00Z">
    <saml:AudienceRestriction>
      <saml:Audience>https://sp.example.com/saml/metadata</saml:Audience>
    </saml:AudienceRestriction>
  </saml:Conditions>
  <saml:AuthnStatement AuthnInstant="2026-07-03T08:30:00Z" SessionIndex="_sess42">
    <saml:AuthnContext>
      <saml:AuthnContextClassRef>
        urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
      </saml:AuthnContextClassRef>
    </saml:AuthnContext>
  </saml:AuthnStatement>
  <saml:AttributeStatement>
    <saml:Attribute Name="mail">
      <saml:AttributeValue>alice@example.org</saml:AttributeValue>
    </saml:Attribute>
  </saml:AttributeStatement>
</saml:Assertion>
```

## Protocol(协议消息)

Core 规范定义了一组请求/响应式的协议消息(命名空间 `urn:oasis:names:tc:SAML:2.0:protocol`,常用前缀 `samlp`):

| 消息对 | 用途 |
|--------|------|
| `<AuthnRequest>` → `<Response>` | SP 请求 IdP 认证用户;IdP 返回携带 Assertion 的 Response。**Web SSO 的主干** |
| `<LogoutRequest>` → `<LogoutResponse>` | 单点登出,SP 或 IdP 均可发起 |
| `<ArtifactResolve>` → `<ArtifactResponse>` | Artifact Binding 下按引用换取真实消息(后端通道) |
| `<AttributeQuery>` → `<Response>` | 后端通道按需查询属性,实战少见 |
| `<ManageNameIDRequest>` 等 | NameID 管理/映射,实战少见 |

所有协议消息共享一组公共属性:`ID`(唯一标识,用于防重放与 `InResponseTo` 关联)、`Version="2.0"`、`IssueInstant`(签发时间,UTC)、`Destination`(接收端点 URL,接收方必须校验与自身一致)。

## Binding(绑定)

Binding 规定协议消息如何搭载在具体传输之上。选择哪种 Binding 由 Metadata 中声明的端点决定。

| Binding | 传输方式 | 特点与限制 | 典型用途 |
|---------|---------|-----------|---------|
| **HTTP-Redirect** | 消息经 DEFLATE 压缩 + Base64 + URL 编码后放入查询参数,302 跳转 | 受 URL 长度限制,只适合小消息;签名以 `SigAlg`/`Signature` 独立查询参数形式附加(不是 XML 签名) | 发送 `AuthnRequest`、`LogoutRequest` |
| **HTTP-POST** | 消息 Base64 后放入自动提交的 HTML 表单字段(`SAMLRequest`/`SAMLResponse`),POST 给对端 | 无长度限制,可承载内嵌 XML 签名的大消息 | 返回 `Response`(最常见),也可发 `AuthnRequest` |
| **HTTP-Artifact** | 前端通道只传一个短引用(artifact),接收方通过后端 SOAP 通道调用 `ArtifactResolve` 换取真实消息 | 消息不经过浏览器,防篡改/防泄露更强,但要求 SP 与 IdP 网络互通,部署复杂 | 高安全场景,实战较少 |
| **SOAP** | 直接的服务器间 SOAP 调用 | 纯后端通道 | ArtifactResolve、后端 SLO、AttributeQuery |

::: tip 实战组合
最普遍的组合是:**AuthnRequest 走 HTTP-Redirect,Response 走 HTTP-POST**。原因很简单:AuthnRequest 很小,放 URL 里方便;Response 含签名后的 Assertion,动辄几 KB 到几十 KB,只能走 POST。
:::

## Profile(剖面)

Profile 把 Core 消息与 Binding 组合成端到端的互操作用例:

- **Web Browser SSO Profile**:最核心的 Profile,定义浏览器介入下 SP-initiated 与 IdP-initiated 两种登录流程,包括允许的 Binding 组合和强制的校验规则(如 bearer SubjectConfirmation 的 `Recipient`/`NotOnOrAfter`/`InResponseTo` 校验)。
- **Single Logout Profile**:定义登出消息如何在会话涉及的各方之间传播。
- 其他:Enhanced Client or Proxy(ECP,非浏览器客户端)、Identity Provider Discovery、Assertion Query 等,使用较少。

具体流程在[典型流程](./flows.md)中分步展开。

## Metadata(元数据)

Metadata 规范定义了实体配置的标准 XML 格式,根元素为 `<EntityDescriptor>`(命名空间 `urn:oasis:names:tc:SAML:2.0:metadata`),内含:

- `entityID`:实体标识;
- `<IDPSSODescriptor>` 或 `<SPSSODescriptor>`:角色描述符,声明支持的 Binding 与端点(如 IdP 的 `<SingleSignOnService>`、SP 的 `<AssertionConsumerService>`、双方的 `<SingleLogoutService>`);
- `<KeyDescriptor use="signing|encryption">`:内嵌 X.509 证书,声明签名验证公钥与加密公钥;
- SP 侧还可声明 `AuthnRequestsSigned`、`WantAssertionsSigned` 等策略开关。

**证书交换是建立信任的核心**:SP 从 IdP Metadata 中取得 IdP 的签名证书用于验证 Response/Assertion 签名;IdP 从 SP Metadata 中取得 SP 的证书用于验证 AuthnRequest 签名和加密 Assertion。工程上通常直接交换 Metadata XML 文件或 Metadata URL,避免手工逐项填写出错。

::: warning 证书轮换
SAML 信任基于交换的证书本身(而非 CA 链),证书过期或轮换时若未同步更新对端 Metadata,会直接导致验签失败、全员无法登录。轮换时应先在 Metadata 中并存新旧两个 `<KeyDescriptor>`,待对端更新后再移除旧证书。
:::

## NameID 与 NameID Format

`<NameID>` 是 Assertion 中标识主体的核心元素,`Format` 属性声明其取值语义。常用 Format:

| Format URI(简写) | 含义 |
|--------------------|------|
| `...:1.1:nameid-format:emailAddress` | 邮箱形式 |
| `...:1.1:nameid-format:unspecified` | 未指定,由双方约定 |
| `...:2.0:nameid-format:persistent` | 持久化化名:对同一 SP 稳定、跨 SP 不同的不透明标识,保护隐私 |
| `...:2.0:nameid-format:transient` | 临时标识:每次会话都不同,仅在会话内有意义 |

SP 在 `AuthnRequest` 的 `<NameIDPolicy>` 中声明期望的 Format。完整列表见[参考页](./reference.md#nameid-format-一览)。

::: tip
业务系统做账号映射时,**不要依赖 email 作为不可变主键**(邮箱会改),优先要求 IdP 发放 `persistent` NameID 或在 Attribute 中附带不可变的员工 ID / immutable ID。
:::

## RelayState

RelayState 是随 SAML 消息一起传递、但**不属于 SAML 消息本身**的一个不透明参数(Redirect Binding 下是查询参数,POST Binding 下是表单字段),规范限制长度不超过 80 字节。

- **SP-initiated 流程**:SP 发出 AuthnRequest 时附带 RelayState,IdP 必须原样回传。SP 通常用它记录"用户登录前想访问的深链接",登录成功后跳回去。
- **IdP-initiated 流程**:RelayState 由 IdP 侧配置,一般直接填目标 URL 或 SP 约定的标识。

::: danger 安全提示
RelayState 未被签名保护且来自不可信输入,SP 使用它做跳转前必须做**开放重定向校验**(只允许本站相对路径或白名单域名),否则会成为钓鱼跳板。更稳妥的做法是只传一个随机 key,真实 URL 存在 SP 本地会话/缓存中。
:::

## XML 签名与加密

### 签在哪里

SAML 使用 XML-DSig **enveloped signature**(签名内嵌在被签元素内部,`<ds:Signature>` 紧跟 `<Issuer>` 之后),可以出现在三个层面:

1. **Assertion 签名**:签在 `<saml:Assertion>` 上,最重要,几乎所有 IdP 默认开启;
2. **Response 签名**:签在外层 `<samlp:Response>` 上,可与 Assertion 签名同时存在;
3. **AuthnRequest / LogoutRequest 签名**:POST Binding 下为 XML 签名;**Redirect Binding 下不是 XML 签名**,而是对 `SAMLRequest=...&RelayState=...&SigAlg=...` 拼接串做的分离签名,放在 `Signature` 查询参数中。

签名算法方面,应使用 `rsa-sha256` 及以上,**拒绝 `rsa-sha1`**;摘要同理。

### SP 验签时必须做什么

1. 用 **Metadata 中登记的证书**验签,而不是信任报文里内嵌的 `<ds:KeyInfo>` 证书(内嵌证书只可用于选择密钥,不可作为信任来源);
2. 确认签名的 `Reference` 覆盖的就是当前处理的 Assertion/Response 元素(防 **XML Signature Wrapping** 攻击:攻击者把合法签名节点挪走,插入伪造节点。对策是"先按 ID 定位被签元素、校验引用唯一性,再从该节点内读取业务数据",并使用维护良好的 SAML 库而非手写 DOM 处理);
3. 若配置要求 Assertion 必须签名,则**外层 Response 有签名不能替代** Assertion 签名要求,反之亦然,按本地策略严格执行。

### 加密

在签名之外,IdP 还可用 SP 的加密公钥对 Assertion 整体加密,得到 `<saml:EncryptedAssertion>`(XML-Enc,通常是 RSA-OAEP 包裹 AES 会话密钥的混合加密);同理有 `<EncryptedID>`、`<EncryptedAttribute>`。加密解决的是**报文经过浏览器时的机密性**(POST Binding 下 Response 会落在浏览器里)。传输层始终必须是 HTTPS,加密是在其上的纵深防御,当 Assertion 含敏感属性时建议开启。

---

下一步:阅读[典型流程](./flows.md)看这些概念如何串成完整的登录/登出交互,或直接查阅[参数与消息参考](./reference.md)。
