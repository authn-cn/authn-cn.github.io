---
title: SAML 登录演示
---

# SAML 登录演示（真实流程）

下面是一个**真实可点**的 SAML 2.0 Web Browser SSO 演示,身份提供方是本站的 [Mock SAML IdP](./saml.md)。点击某个测试用户后:

1. 演示 SP 生成一个 `AuthnRequest`(带唯一 `ID`);
2. 浏览器请求 Mock IdP,IdP 验证用户(演示中直接指定 alice / bob,免去用户选择页)并签发**签名的 SAML Response**;
3. 本页解码 base64,取出签名的 `Response` XML;
4. 逐项校验:`StatusCode`、`InResponseTo`(与 AuthnRequest 关联)、`Audience`、`Conditions` 时效,并用断言**内嵌证书的公钥验证签名**(RSA-SHA256);
5. 从断言读取 `NameID` 与属性。

<ClientOnly>
  <SamlDemo />
</ClientOnly>

## 这演示了什么

- **签名断言**:IdP 用私钥对断言签名,SP 用 IdP 证书验签,确保断言未被篡改、确实来自可信 IdP。
- **`InResponseTo` 关联**:回来的 Response 关联到最初 `AuthnRequest` 的 `ID`,防止断言被张冠李戴或重放(类比 OIDC 的 `state`)。
- **`Audience` 限定**:断言声明它只对本 SP(entityID)有效,别的 SP 不能拿去用。
- **`Conditions` 时效**:`NotBefore` / `NotOnOrAfter` 限定断言的有效时间窗。

::: tip 关于验签
SAML 的签名验证在真实系统中由 **SP 服务端**完成,需要 XML 规范化(exc-c14n)。本演示在浏览器里验证了 `SignedInfo` 的 RSA-SHA256 签名;完整验签还需比对 `DigestValue` 与证书信任链——本站的 [Mock SP 控制台](https://mock.authn.tech/saml/sp/) 用业界库 `xml-crypto` 做了权威的服务端验签。
:::

对照 OIDC 的等价流程见 [OIDC 登录演示](./demo.md)。

<script setup>
import SamlDemo from '@components/SamlDemo.vue'
</script>
