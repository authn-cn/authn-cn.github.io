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

::: tip Welchen Algorithmus wählen
Den Unterschied und die Einsatzszenarien von symmetrisch (`HS*`) und asymmetrisch (`RS*`/`PS*`/`ES*`) finden Sie in der [JWT- / JOSE-Dokumentation · Signaturalgorithmen](../jwt/concepts.md#signaturalgorithmen-symmetrisch-vs-asymmetrisch).
:::

<script setup>
import JwtSigner from '@components/JwtSigner.vue'
</script>
