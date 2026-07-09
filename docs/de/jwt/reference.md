---
title: "Parameter & Claims – Referenz"
---

# Parameter & Claims – Referenz

## Registrierte Claims (Registered Claims, RFC 7519 §4.1)

Dies sind die von RFC 7519 reservierten Standard-Payload-Felder, alle **optional**, werden aber von übergeordneten Spezifikationen wie OAuth2 / OIDC bei Bedarf als erforderlich festgelegt.

| Claim | Vollname | Bedeutung |
|-------|------|------|
| `iss` | Issuer | Kennung des Ausstellers, üblicherweise die HTTPS-URL des AS/OP |
| `sub` | Subject | Betreff (die vom Token beschriebene Entität), eindeutig im Bereich von `iss` |
| `aud` | Audience | Publikum, der vorgesehene Empfänger des Tokens; kann ein String oder ein Array sein |
| `exp` | Expiration Time | Ablaufzeit (Unix-Sekunden), danach muss abgelehnt werden |
| `nbf` | Not Before | Gültigkeitsbeginn (Unix-Sekunden), davor muss abgelehnt werden |
| `iat` | Issued At | Ausstellungszeit (Unix-Sekunden) |
| `jti` | JWT ID | eindeutige Kennung des Tokens, nutzbar für Replay-Schutz/Blacklist |

::: tip Zeitbezogene Claims sind alle in Unix-Sekunden
`exp` / `nbf` / `iat` sind alle **Sekunden** seit dem 01.01.1970 UTC (nicht Millisekunden). Bei der Validierung ist eine geringe Zeitabweichung (Clock Skew) zulässig, üblicherweise ≤ 300 Sekunden.
:::

## Häufige Header-Felder

| Feld | Bedeutung |
|------|------|
| `alg` | Signatur-/Verschlüsselungsalgorithmus (siehe Tabelle unten) |
| `typ` | Tokentyp: `JWT`; das access token nach RFC 9068 verwendet `at+jwt`; das Logout Token verwendet `logout+jwt` |
| `kid` | Key ID, lokalisiert zusammen mit JWKS den öffentlichen Schlüssel zur Signaturprüfung |
| `cty` | Content Type, bei verschachteltem JWT verwendet |
| `jku` / `x5c` / `x5t` | URL zum Schlüssel / Zertifikatskette / Zertifikat-Fingerabdruck (das Akzeptieren eines externen `jku` ist riskant und erfordert Vorsicht) |

## `alg`-Werte

### JWS-Signaturalgorithmen (RFC 7518 §3)

| `alg` | Beschreibung | Schlüsseltyp |
|-------|------|----------|
| `HS256` / `HS384` / `HS512` | HMAC + SHA-2 | symmetrischer gemeinsamer Schlüssel |
| `RS256` / `RS384` / `RS512` | RSASSA-PKCS1-v1_5 + SHA-2 | RSA-Schlüsselpaar |
| `PS256` / `PS384` / `PS512` | RSASSA-PSS + SHA-2 | RSA-Schlüsselpaar |
| `ES256` / `ES384` / `ES512` | ECDSA + SHA-2 | EC-Schlüsselpaar |
| `EdDSA` | Ed25519 / Ed448 (RFC 8037) | OKP-Schlüsselpaar |
| `none` | keine Signatur | —— |

::: danger `none` niemals akzeptieren
In der Produktion **muss** eine `alg`-Whitelist gepflegt und `none` abgelehnt werden; zugleich muss die erwartete Algorithmusfamilie festgelegt werden, um RS256→HS256-Verwechslungsangriffe zu verhindern. Details siehe [Kernkonzepte · Drei fatale Fallstricke bei der Signaturprüfung](./concepts.md#ablauf-der-signaturprufung).
:::

### Häufige JWE-Verschlüsselungsalgorithmen (RFC 7518, wenn Vertraulichkeit nötig)

| Zweck | Beispielwerte |
|------|----------|
| Schlüsselverwaltung (`alg`) | `RSA-OAEP`, `ECDH-ES`, `A256KW` |
| Inhaltsverschlüsselung (`enc`) | `A128GCM`, `A256GCM`, `A256CBC-HS512` |

## Base64URL

Die Segmente eines JWT werden mit **Base64URL** (RFC 4648 §5) codiert; die Unterschiede zum Standard-Base64:

- `+` → `-`, `/` → `_`
- Entfernen des abschließenden `=`-Paddings

Ziel ist es, das Token sicher in URLs und HTTP-Header packen zu können. Mit dem [Base64URL-Tool](../tools/base64url.md) können Sie hin und her konvertieren.

## Index verwandter RFCs

| RFC | Titel |
|-----|------|
| [RFC 7515](https://www.rfc-editor.org/rfc/rfc7515) | JSON Web Signature (JWS) |
| [RFC 7516](https://www.rfc-editor.org/rfc/rfc7516) | JSON Web Encryption (JWE) |
| [RFC 7517](https://www.rfc-editor.org/rfc/rfc7517) | JSON Web Key (JWK) |
| [RFC 7518](https://www.rfc-editor.org/rfc/rfc7518) | JSON Web Algorithms (JWA) |
| [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519) | JSON Web Token (JWT) |
| [RFC 7662](https://www.rfc-editor.org/rfc/rfc7662) | OAuth 2.0 Token Introspection |
| [RFC 8037](https://www.rfc-editor.org/rfc/rfc8037) | JOSE-Nutzung der CFRG-Kurven (EdDSA usw.) |
| [RFC 9068](https://www.rfc-editor.org/rfc/rfc9068) | JWT Profile for OAuth 2.0 Access Tokens |

## Verwandte Tools

- [JWT-Parser](../tools/jwt.md) —— Decodieren und Signaturprüfung
- [JWT-Signaturgenerator](../tools/jwt-sign.md) —— Test-Tokens erstellen
- [JWK-Generierung](../tools/jwk.md) · [JWK → PEM](../tools/jwk-convert.md) · [PEM → JWK](../tools/pem-to-jwk.md)
- [Base64URL-Codierung/Decodierung](../tools/base64url.md)
