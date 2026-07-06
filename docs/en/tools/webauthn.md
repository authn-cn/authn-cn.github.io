---
title: WebAuthn Demo
---

# WebAuthn / Passkey Demo

Call WebAuthn API in real-time on this page's domain, create and use a Passkey, parse and display browser-returned `clientDataJSON`, `authenticatorData` (flags / signCount), attestation format and credential public key (COSE). Requires WebAuthn-capable browser and authenticator (platform fingerprint / Face ID / security key). Pure frontend, data never uploaded.

<ClientOnly>
  <WebauthnDemo />
</ClientOnly>

::: tip Complete Server-Side Flow
This page only demonstrates browser-side data structure. For a complete registration/login loop with **server-side verification**, see [Mock WebAuthn RP](https://mock.authn.tech/webauthn/).
:::

See [WebAuthn Registration and Authentication Flows](../webauthn/flows.md).

<script setup>
import WebauthnDemo from '@components/WebauthnDemo.vue'
</script>
