---
title: Base64URL-Codierung/Decodierung
---

# Base64 / Base64URL Codierung / Decodierung

Gegenseitige Konvertierung zwischen Text und Base64 / Base64URL. JWTs verschiedene Segmente, SAML-Nachrichten verwenden alle Base64(URL)-Codierung. Alles wird lokal im Browser durchgeführt.

<ClientOnly>
  <Base64UrlTool />
</ClientOnly>

::: tip Unterschied
**Base64URL** ersetzen die Standard-Base64 `+` `/` mit `-` `_` und entfernen die abschließenden `=` Polsterung, um sicher in URLs und JWT platziert zu werden.
:::

<script setup>
import Base64UrlTool from '@components/Base64UrlTool.vue'
</script>
