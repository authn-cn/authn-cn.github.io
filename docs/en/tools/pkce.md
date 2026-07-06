---
title: PKCE Generator
---

# PKCE Generator

Generate `code_verifier` and `code_challenge` (S256) for OAuth 2.0 / OIDC authorization code flow, plus `state`, `nonce` random values. All generated in-browser.

<ClientOnly>
  <PkceTool />
</ClientOnly>

## How to Use

1. Include `code_challenge` and `code_challenge_method=S256` in authorization request (authorization endpoint), plus `state`, `nonce`;
2. Include `code_verifier` when exchanging for token (token endpoint);
3. Authorization server compares `SHA-256(code_verifier)` against the previous `code_challenge`.

See PKCE explanation in [OAuth 2.0 Core Concepts](../oauth2/concepts.md).

<script setup>
import PkceTool from '@components/PkceTool.vue'
</script>
