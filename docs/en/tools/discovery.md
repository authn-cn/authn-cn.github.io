---
title: OIDC Discovery Viewer
---

# OIDC Discovery Viewer

Enter an OpenID Provider's issuer (or full discovery URL), fetch and interpret its `/.well-known/openid-configuration` and JWKS. Pre-filled with this site's Mock OP for direct testing. Also supports **manual JSON paste**: when target OP lacks CORS, use `curl` to fetch discovery (and optional JWKS) then switch to "manual JSON paste" mode to parse.

<ClientOnly>
  <OidcDiscovery />
</ClientOnly>

::: warning CORS
"Fetch by URL" requests directly from your browser. If the target lacks cross-origin access (CORS), the browser blocks it — that's normal; use command-line `curl` instead then switch to "manual JSON paste". This site's [Mock OP](../mock/) has CORS enabled.
:::

See Discovery and JWKS explanation in [OIDC Core Concepts](../oidc/concepts.md).

<script setup>
import OidcDiscovery from '@components/OidcDiscovery.vue'
</script>
