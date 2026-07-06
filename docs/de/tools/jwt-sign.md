---
title: JWT-Signatursgenerator
---

# JWT-Signatursgenerator

Geben Sie Payload und Schlüssel ein, um ein signiertes JWT zu generieren, praktisch zum Erstellen von Test-Tokens. Unterstützt HMAC (`HS*`), RSA (`RS*` / `PS*`), ECDSA (`ES*`); für asymmetrische Algorithmen können Sie mit einem Klick passende Test-Schlüsselpaare generieren. Alle Berechnungen erfolgen lokal im Browser, der Schlüssel wird nicht hochgeladen.

<ClientOnly>
  <JwtSigner />
</ClientOnly>

::: warning Nur zum Testen
Bitte geben Sie keine Produktionsprivatschlüssel ein. Das generierte Token kann mit dem [JWT-Verifizierungstool](./jwt.md) validiert werden oder mit dem [JWK-Generator](./jwk.md) Schlüsselpaaren kombiniert werden.
:::

<script setup>
import JwtSigner from '@components/JwtSigner.vue'
</script>
