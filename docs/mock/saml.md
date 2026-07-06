---
title: SAML Mock
---

# SAML Mock

SAML 一侧包含两个角色:**IdP**(签发方)与 **SP**(消费方),二者配对即可端到端演示 Web Browser SSO。术语与整体说明见 [Mock 概览](./README.md)。

**服务地址:<https://mock.authn.tech/>**

## IdP —— Identity Provider(身份提供方)

| 端点 | 路径 |
|------|------|
| Metadata | [`/saml/idp/metadata`](https://mock.authn.tech/saml/idp/metadata) |
| SSO(Redirect / POST) | `/saml/idp/sso` |

- 把 Metadata URL 导入你的 SP 即可对接。**SP-initiated**:向 SSO 端点发 `AuthnRequest`(支持 Redirect 与 POST Binding)。
- **IdP-initiated**:`/saml/idp/sso?user=alice&sp=<SP-entityID>&acs=<SP-ACS-URL>`。
- 签发含 `AttributeStatement`(email / name 等)的签名断言,已通过业界标准库 `xml-crypto` 独立验签,自签名证书内置于 Metadata。

## SP —— Service Provider(服务提供方)

| 端点 | 路径 |
|------|------|
| 控制台 | [`/saml/sp/`](https://mock.authn.tech/saml/sp/) |
| Metadata | [`/saml/sp/metadata`](https://mock.authn.tech/saml/sp/metadata) |
| ACS(POST) | `/saml/sp/acs` |

打开控制台点一下即可发起 SP-initiated 登录,并**展示验签结果与断言解析**。

## 调用顺序(SP-initiated Web Browser SSO)

以「你的 SP + Mock IdP」为例:

1. **SP** 生成 `AuthnRequest`,把浏览器重定向(或 POST)到 **IdP** 的 `/saml/idp/sso`。
2. **IdP** 展示测试用户选择页(或凭 `&user=alice` 直接选定)。
3. **IdP** 生成并**签名** SAML `Response`(内含 `Assertion`),通过浏览器 POST 回到 **SP** 的 ACS(`AssertionConsumerService`)地址。
4. **SP** 用 IdP Metadata 里的证书**验签**,校验 `Audience`、`NotBefore` / `NotOnOrAfter`、`InResponseTo` 等条件。
5. **SP** 从 `Assertion` 读取 `NameID` 与属性,建立本地会话。

> `AuthnRequest` / `Response` 原文可用 [SAML 编解码](../tools/saml.md) 与 [SAML Response 解析](../tools/saml-parse.md) 查看;Metadata 用 [SAML Metadata 解析](../tools/saml-metadata.md)。
