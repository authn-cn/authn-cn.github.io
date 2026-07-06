---
title: JWK / JWKS → PEM
---

# JWK / JWKS → PEM Konvertierung

Fügen Sie ein einzelnes JWK oder eine komplette JWKS ein, konvertieren Sie zu PEM-Öffentlichschlüssel (SPKI), und zeigen Sie für jeden Schlüssel `kty` / `alg` / `use` / `kid` sowie nach [RFC 7638](https://datatracker.ietf.org/doc/html/rfc7638) berechneter JWK Thumbprint. Unterstützt RSA und EC; wenn Privatschlüsselfelder enthalten sind, wird nur der Öffentlichschlüsselteil exportiert. Reine Browser-lokale Konvertierung, nicht hochgeladen.

<ClientOnly>
  <JwkConverter />
</ClientOnly>

::: tip Woher JWKS bekommen
Verwenden Sie [OIDC Discovery-Viewer](./discovery.md) um beliebige OP `jwks_uri` zu abrufen, fügen Sie die darin enthaltenen Schlüssel hier ein, um zum PEM zu konvertieren, für die Verwendung bei [JWT-Verifizierung](./jwt.md). Umgekehrte Operation (Schlüsselerzeugung) siehe [JWK-Generator](./jwk.md).
:::

<script setup>
import JwkConverter from '@components/JwkConverter.vue'
</script>
