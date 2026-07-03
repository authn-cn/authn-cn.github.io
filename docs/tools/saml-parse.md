---
title: SAML Response 解析器
---

# SAML Response / Assertion 解析器

粘贴 `SAMLResponse` 的值、含它的完整 URL,或原始 XML,结构化展示关键字段:Status、Issuer、Subject/NameID、SubjectConfirmation、Conditions 与时效、Audience、AuthnStatement、AttributeStatement,以及签名/摘要算法。自动识别 base64 与 deflate(Redirect Binding)编码。纯浏览器本地解析,不上传。

<ClientOnly>
  <SamlResponseParser />
</ClientOnly>

::: warning 解析 ≠ 验签
本工具展示报文结构与字段,**不验证签名有效性**——签名是否可信需由 SP 用 IdP 证书校验。需要看编码/生成 AuthnRequest 见 [SAML 编解码](./saml.md);看证书见 [X.509 解析](./cert.md)。
:::

<script setup>
import SamlResponseParser from '@components/SamlResponseParser.vue'
</script>
