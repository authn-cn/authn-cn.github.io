---
title: OIDC Discovery-Viewer
---

# OIDC Discovery-Viewer

Geben Sie einen OpenID Provider issuer (oder vollständige Discovery-URL) ein, rufen Sie `/.well-known/openid-configuration` und JWKS ab und dekodieren Sie diese. Standardmäßig vorausgefüllt mit diesem Standorts Mock OP, können Sie direkt erleben. Unterstützt auch **manuelles Einfügen von JSON**: Wenn das Ziel-OP CORS nicht aktiviert hat, rufen Sie mit `curl` die Discovery (und optional JWKS) ab und fügen Sie zum Parsen ein.

<ClientOnly>
  <OidcDiscovery />
</ClientOnly>

::: warning CORS
"URL abrufen" sendet direkt vom Browser eine Anfrage an den Ziel-OP. Wenn das Ziel Cross-Origin nicht aktiviert hat (CORS), blockiert der Browser — das ist normal, verwenden Sie stattdessen command line `curl` zum Abrufen und wechseln Sie zu "JSON manuell einfügen". Dieser Standort [Mock OP](../mock/) hat CORS aktiviert.
:::

Detailliert siehe [OIDC Kernkonzepte](../oidc/concepts.md) Discovery und JWKS Erklärung.

<script setup>
import OidcDiscovery from '@components/OidcDiscovery.vue'
</script>
