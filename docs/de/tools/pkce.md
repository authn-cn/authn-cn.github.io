---
title: PKCE-Generator
---

# PKCE-Generator

Generieren Sie für OAuth 2.0 / OIDC Authorization Code Flow PKCE-`code_verifier` und `code_challenge` (S256) sowie `state`, `nonce` Zufallswerte. Alles wird lokal im Browser generiert.

<ClientOnly>
  <PkceTool />
</ClientOnly>

## Wie man es verwendet

1. Authorization Request (authorization endpoint) enthält `code_challenge` und `code_challenge_method=S256`, sowie `state`, `nonce`;
2. Token-Austausch (token endpoint) enthält `code_verifier`;
3. Authorization Server vergleicht `SHA-256(code_verifier)` mit der früheren `code_challenge`.

Detailliert siehe [OAuth 2.0 Kernkonzepte](../oauth2/concepts.md) PKCE-Erklärung.

<script setup>
import PkceTool from '@components/PkceTool.vue'
</script>
