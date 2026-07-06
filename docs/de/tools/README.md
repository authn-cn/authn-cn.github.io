---
title: Tools-Übersicht
---

# Online-Tools

Diese Website bietet eine Reihe von Online-Tools für die Fehlersuche von Authentifizierungsprotokollen. **Die gesamte Logik läuft lokal im Browser, Ihre Token / Nachrichten werden auf keinen Server hochgeladen**, Sie können beruhigt Fehlersuchen-Daten einfügen.

## JWT / JWK

| Tool | Zweck |
|------|------|
| [JWT-Analyse und Signaturverifizierung](./jwt.md) | jwt.io-Stil zweispaltiges Decoding, dreisegmentig farbig hervorgehoben; unterstützt vollständige `HS/RS/PS/ES` Signaturverifizierung |
| [JWT-Signatursgenerator](./jwt-sign.md) | Payload + Schlüssel eingeben, um ein signiertes Token zu generieren, mit One-Click-Testschlüsselpaar-Generierung |
| [JWK / Schlüsselpaar-Generierung](./jwk.md) | RSA/EC-Schlüsselpaare generieren, JWK, JWKS, PEM exportieren, RFC 7638 `kid` enthalten |
| [JWK / JWKS → PEM](./jwk-convert.md) | JWK/JWKS in PEM-Öffentlichschlüssel konvertieren, zeige `kty`/`alg`/`use`/`kid` und Thumbprint |
| [PEM → JWK](./pem-to-jwk.md) | PEM-Öffentlichschlüssel (SPKI) / Privatschlüssel (PKCS#8) in JWK konvertieren, RFC 7638 `kid` enthalten |

## OAuth2 / OIDC

| Tool | Zweck |
|------|------|
| [PKCE-Generator](./pkce.md) | `code_verifier` / `code_challenge` (S256) sowie `state`, `nonce` Zufallswerte generieren |
| [OIDC Discovery-Viewer](./discovery.md) | Geben Sie issuer ein, rufen Sie ab und dekodieren Sie `/.well-known/openid-configuration` und JWKS |

## MFA / Passkey

| Tool | Zweck |
|------|------|
| [TOTP-Tool](./totp.md) | Geheimschlüssel generieren, Echtzeit-Verifizierungscodes und Countdown, `otpauth://` URI und QR-Code, Verifizierungscodes validieren |
| [WebAuthn-Demo](./webauthn.md) | Browser-interne echte Erstellung/Verwendung von Passkey, Parse attestation/assertion Datenstrukturen |

## SAML / Zertifikat / Codierung

| Tool | Zweck |
|------|------|
| [SAML-Codierung/Decodierung](./saml.md) | Dekodiere `SAMLRequest` / `SAMLResponse` (automatische Erkennung von Redirect / POST-Codierung), generiere AuthnRequest und Redirect-URL |
| [SAML-Metadata-Parser](./saml-metadata.md) | Parse Metadata: Rolle, entityID, Endpunkte, NameIDFormat, eingebettetes Zertifikat zeige Gültigkeitsdauer/Fingerabdruck |
| [SAML Response-Parser](./saml-parse.md) | Strukturierte Anzeige von Response/Assertion: Subject, Conditions, Attributes, Signaturalgorithmus |
| [X.509-Zertifikat-Parser](./cert.md) | Parse PEM/DER-Zertifikat: Subject, Issuer, Gültigkeitsdauer, Öffentlichschlüssel/Signaturalgorithmus, SHA-1/SHA-256-Fingerabdruck |
| [PEM-Parser](./pem-parse.md) | Erkenne beliebige PEM-Blocktypen (Zertifikat/CSR/öffentlich/privat/CRL usw.), zeige DER-Länge und Schlüsselalgorithmus |
| [Base64URL-Codierung/Decodierung](./base64url.md) | Text ↔ Base64 / Base64URL gegenseitige Konvertierung |

::: tip Begleitender Mock-Service
Wollen Sie End-to-End-Tests? Siehe [Mock-Server](../mock/): OIDC OP/RP, Ressourcenserver, SAML IdP/SP vollständige vier Rollen, inklusive echter [OIDC-Anmeldungs-Demo](../mock/demo.md). Gewünschte Tools können Sie gerne auf [GitHub](https://github.com/authn-cn/authn-cn.github.io/issues) einreichen.
:::
