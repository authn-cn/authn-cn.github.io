---
title: Base64URL 编解码
---

# Base64 / Base64URL 编解码

在文本与 Base64 / Base64URL 之间互转。JWT 的各段、SAML 报文都用到 Base64(URL) 编码。全部在浏览器本地完成。

<ClientOnly>
  <Base64UrlTool />
</ClientOnly>

::: tip 区别
**Base64URL** 用 `-` `_` 替换标准 Base64 的 `+` `/`,并去掉末尾 `=` 填充,以便安全地放进 URL 与 JWT。
:::

<script setup>
import Base64UrlTool from '@components/Base64UrlTool.vue'
</script>
