---
title: Base64 / Base64URL Encoder/Decoder
---

# Base64 / Base64URL Encoder/Decoder

Convert between text and Base64 / Base64URL. JWT segments and SAML messages use Base64(URL) encoding. All in-browser.

<ClientOnly>
  <Base64UrlTool />
</ClientOnly>

::: tip Difference
**Base64URL** replaces standard Base64's `+` `/` with `-` `_` and removes trailing `=` padding, for safe placement in URLs and JWTs. For why each JWT segment uses it, see the [JWT / JOSE documentation](../jwt/).
:::

<script setup>
import Base64UrlTool from '@components/Base64UrlTool.vue'
</script>
