---
title: OIDC Login Demo
---

# OIDC Login Demo (Real Flow)

Below is a **real, clickable** OpenID Connect login demo, with the backend being this site's [Mock OIDC OP](./oidc.md). After clicking the button:

1. Browser generates PKCE (`code_verifier` / `code_challenge`) and `state`, `nonce`, redirects to Mock OP's authorization endpoint;
2. Select a test user (alice / bob) from Mock OP—it has no password, click anyone to become them;
3. Mock OP redirects back to **this page** with `code`;
4. This page automatically exchanges the `code` (+ `code_verifier`) for `id_token` / `access_token` at the token endpoint, calls `userinfo`, and displays the parsing results and validation at each step.

<ClientOnly>
  <OidcDemo />
</ClientOnly>

## What This Demo Shows

- **Authorization Code Flow + PKCE**: Authorization code is passed back via browser, `code_verifier` is only shown in the token request, so even if the code leaks, it cannot be exchanged for a token.
- **`state` validation**: Compare `state` on callback to prevent CSRF.
- **`nonce` validation**: Compare the `nonce` in ID Token with the value sent, preventing ID Token replay.
- **`aud` validation**: Confirm the ID Token's `aud` is this client.
- **Token and identity separation**: `access_token` is used to call `userinfo`, `id_token` is used to confirm "who is the user."

Want to operate manually step-by-step, or integrate into your own application? See [OIDC Mock Endpoints and Call Sequence](./oidc.md); want to parse any JWT? Use [JWT Parser](../tools/jwt.md).

<script setup>
import OidcDemo from '@components/OidcDemo.vue'
</script>
