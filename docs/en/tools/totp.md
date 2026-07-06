---
title: TOTP Tool
---

# TOTP Generator / Verifier

Generate TOTP shared secret (Base32), compute current code and countdown in real-time, generate `otpauth://` URI and QR code (scannable with Google Authenticator / Authy), and verify a code. All computed in-browser; secrets never uploaded.

For development and debugging:

- **QR Code Import** — upload a `otpauth://` QR code image (decoded locally with `jsQR`), or paste `otpauth://` URI directly to auto-populate fields.
- **Save as Bookmark** — "add to address bar" encodes current TOTP into URL fragment (`#t=…`), press <kbd>Ctrl</kbd>+<kbd>D</kbd> to bookmark, next time the bookmark auto-restores; also copy bookmark link.
- **Local List** — "save to local list" stores multiple TOTPs in browser `localStorage`, each entry generates codes in real-time, one-click code copy, edit or delete. Great for testing multiple accounts simultaneously.

::: warning Security Note
Bookmark links and local lists store **plaintext secrets** (in URL / bookmarks / localStorage), for test keys only; never store production TOTP secrets.
:::

<ClientOnly>
  <TotpTool />
</ClientOnly>

::: tip Integration with Mock
This site's [Mock TOTP Verifier](https://mock.authn.tech/totp/) computes/verifies codes server-side with the same secret:
`curl "https://mock.authn.tech/totp/code?secret=<your-secret>"`
:::

See [HOTP / TOTP Algorithm Details](../mfa/totp.md).

<script setup>
import TotpTool from '@components/TotpTool.vue'
</script>
