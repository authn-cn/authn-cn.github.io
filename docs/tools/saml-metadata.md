---
title: SAML Metadata 解析器
---

# SAML Metadata 解析器

粘贴 SAML `EntityDescriptor` / `EntitiesDescriptor` XML,解析出实体 `entityID`、角色(IdP / SP)、各端点(SSO / ACS / SLO 及其 Binding)、`NameIDFormat`,并对内嵌的 `X509Certificate` 展示主体、有效期与 SHA-256 指纹。纯浏览器本地解析,不上传。

<ClientOnly>
  <SamlMetadataParser />
</ClientOnly>

::: tip 试一试
本站 Mock IdP 的 metadata 可直接拉取粘入:<https://mock.authn.tech/saml/idp/metadata>
:::

详见 [SAML 核心概念](../saml/concepts.md) 中的 Metadata 说明。

<script setup>
import SamlMetadataParser from '@components/SamlMetadataParser.vue'
</script>
