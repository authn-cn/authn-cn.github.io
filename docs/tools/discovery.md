---
title: OIDC Discovery 查看器
---

# OIDC Discovery 查看器

输入一个 OpenID Provider 的 issuer(或完整 discovery URL),拉取并解读它的 `/.well-known/openid-configuration` 与 JWKS。默认填了本站的 Mock OP,可直接体验。

<ClientOnly>
  <OidcDiscovery />
</ClientOnly>

::: warning CORS
本工具直接从你的浏览器请求目标 OP。若目标未开启跨域(CORS),浏览器会拦截——这属正常,可改用命令行 `curl` 拉取。本站 [Mock OP](../mock/) 已开启 CORS。
:::

详见 [OIDC 核心概念](../oidc/concepts.md) 中的 Discovery 与 JWKS 说明。

<script setup>
import OidcDiscovery from '@components/OidcDiscovery.vue'
</script>
