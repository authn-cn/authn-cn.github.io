---
title: JWT-Parser
---

# JWT Online-Analyse und Signaturverifizierung

Zweispaltiges Layout ähnlich jwt.io: Fügen Sie auf der linken Seite ein JWT ein (unterstützt `Bearer ` Präfix, dreisegmentig nach Header/Payload/Signature farbig hervorgehoben), auf der rechten Seite erfolgt Echtzeitdecodierung. Zeit-Claims (`exp` / `nbf` / `iat` / `auth_time`) werden automatisch in die lokale Zeit konvertiert und auf Gültigkeit überprüft; Sie können auch rechts unten **Signaturen verifizieren** — bei `HS256/384/512` geben Sie den gemeinsamen Schlüssel ein, bei `RS/PS/ES` Reihen geben Sie PEM-Öffentlichschlüssel ein, und das Verifizierungsergebnis wird in Echtzeit angezeigt. Alle Berechnungen erfolgen lokal im Browser, das Token und der Schlüssel werden nicht hochgeladen.

<ClientOnly>
  <JwtDecoder />
</ClientOnly>

::: tip Ausprobieren
Die Seite ist mit jwt.io's klassischem Beispiel (HS256) vorgefüllt. Geben Sie in das Secret-Feld rechts unten `your-256-bit-secret` ein, um <strong>✔ Signatur gültig</strong> zu sehen.
:::

## Über JWT

JWT (JSON Web Token, RFC 7519) besteht aus drei Base64URL-codierten Segmenten, getrennt durch `.`:

```
Header.Payload.Signature
```

- **Header**: Deklariert Signaturalgorithmus (`alg`) und Typ (`typ`), kann Schlüsselbezeichner `kid` enthalten
- **Payload**: Claims-Sammlung wie `iss` (Aussteller), `sub` (Betreff), `aud` (Publikum), `exp` (Ablaufdatum)
- **Signature**: Signatur der ersten zwei Segmente, verhindert Manipulation

::: warning Decodierung ≠ Verifizierung
Die ersten zwei Segmente von JWT sind nur codiert, nicht verschlüsselt, jeder kann sie decodieren. Nur wenn Sie in diesem Tool den korrekten Schlüssel/Öffentlichschlüssel eingeben und **✔ Signatur gültig** sehen, sind die darin enthaltenen Claims vertrauenswürdig; der Server muss auch weiterhin `iss` / `aud` / `exp` validieren. Details siehe [OIDC Kernkonzepte](../oidc/concepts.md) ID-Token-Verifizierungsprüfliste.
:::

::: tip Mehr über JWT erfahren
Die Zugehörigkeit des Formats (warum JWT unabhängig von OAuth2/OIDC ist), die dreiteilige Struktur, der Ablauf der Signaturprüfung und häufige Fallstricke sowie welche der drei OIDC-Tokens (ID / Access / Refresh) JWTs sind, siehe [JWT- / JOSE-Dokumentation](../jwt/).
:::

<script setup>
import JwtDecoder from '@components/JwtDecoder.vue'
</script>
