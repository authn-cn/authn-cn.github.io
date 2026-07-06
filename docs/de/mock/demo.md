---
title: OIDC-Login-Demo
---

# OIDC-Login-Demo (Echter Prozess)

Unten ist eine **echte klickbare** OpenID Connect Login-Demo, Backend ist Mock OIDC OP dieser Site. Nach Klick auf Button:

1. Browser generiert PKCE (`code_verifier` / `code_challenge`) und `state`, `nonce`, springt zu Mock OP Autorisierungs-Endpunkt;
2. Bei Mock OP Test-Benutzer wählen (alice / bob) —— es hat kein Passwort, klick wer ist wer;
3. Mock OP springt mit `code` zu **diese Seite** zurück;
4. Diese Seite nutzt automatisch `code` (+ `code_verifier`) zu token Endpunkt um `id_token` / `access_token` zu tauschen, ruft `userinfo` auf, zeigt die Analyse jedes Schritts und Verifikation.

<ClientOnly>
  <OidcDemo />
</ClientOnly>

## Das Demo zeigt

- **Authorization Code Flow + PKCE**: Autorisierungscode wird über Browser übertragen, `code_verifier` nur in token Request gezeigt, selbst wenn Autorisierungscode leckt kann es nicht zu Token getauscht werden.
- **`state` Verifizierung**: Vergleiche `state` bei Rücksprung, verhindere CSRF.
- **`nonce` Verifizierung**: Vergleiche ID Token `nonce` mit Ausgangswert, verhindere ID Token Wiedergabe.
- **`aud` Verifizierung**: Bestätige, dass `aud` des ID Token dieser Client ist.
- **Token und Identität getrennt**: `access_token` nutzt `userinfo` aufzurufen, `id_token` um zu bestätigen "wer ist der Benutzer".

Für manuelle Schritt-für-Schritt Operation oder Integration in eigene Anwendung, siehe [OIDC Mock Endpunkte und Aufruffolge](./oidc.md); für beliebige JWT Analyse, nutzen Sie [JWT Parser](../tools/jwt.md).

<script setup>
import OidcDemo from '@components/OidcDemo.vue'
</script>
