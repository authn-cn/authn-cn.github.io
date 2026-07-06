---
home: true
title: Startseite
heroText: Authn.tech
tagline: Authentifizierungs- und Autorisierungswerkzeuge auf Deutsch — Online-Tools · Mock-Server · Protokolldokumentation
actions:
  - text: Online-Tools öffnen
    link: /de/tools/
    type: primary
  - text: Mock-Server-Demo
    link: /de/mock/
    type: secondary
features:
  - title: 🛠 Online-Tools
    details: 13 reine Browser-Tools, Daten bleiben lokal — JWT-Analyse und Signierung, PKCE-Generierung, OIDC Discovery-Viewer, SAML-Nachrichtencoding/Decoding und Metadata-Analyse, JWK↔PEM-Konvertierung, TOTP, WebAuthn-Demo und mehr.
  - title: 🚀 Mock-Server
    details: SAML- / OIDC-Dual-Protocol-Mock mit vollständigen vier Rollen (IdP / SP / OP / RP) plus Ressourcenserver mit echten Signaturen und Signaturverifizierung, für Integrationstests und Lernen.
  - title: 📖 Protokolldokumentation
    details: Systematische SAML 2.0, OAuth 2.0, OIDC, WebAuthn/Passkey, MFA/TOTP Dokumentation — Kernkonzepte, typische Abläufe, Schlüsselparameter für ingenieurmäßige Praxis.
footer: Authn.tech · Authentifizierung und Autorisierung klar erklären
---

## Online-Tools

Laufen rein im Browser, Daten bleiben lokal, sofort einsatzbereit:

- **JWT** — [Parser](/de/tools/jwt.html) (jwt.io-Stil, dreisegmentig hervorgehoben + Signaturverifizierung), [Signatursgenerator](/de/tools/jwt-sign.html)
- **OAuth 2.0 / OIDC** — [PKCE-Generator](/de/tools/pkce.html), [OIDC Discovery-Viewer](/de/tools/discovery.html), [JWK-Viewer](/de/tools/jwk.html), [JWK → PEM](/de/tools/jwk-convert.html), [PEM → JWK](/de/tools/pem-to-jwk.html)
- **SAML** — [Nachrichtencoding/Decoding](/de/tools/saml.html), [Response-Parser](/de/tools/saml-parse.html), [Metadata-Parser](/de/tools/saml-metadata.html)
- **MFA / Passkey** — [TOTP-Code-Generator](/de/tools/totp.html), [WebAuthn-Demo](/de/tools/webauthn.html)
- **Allgemein** — [Base64URL-Codierung/Decodierung](/de/tools/base64url.html), [Zertifikat-Viewer](/de/tools/cert.html), [PEM-Parser](/de/tools/pem-parse.html)

## Mock-Server

SAML- / OIDC-Dual-Protocol-Mock mit vollständigen vier Rollen, echten Signaturen und Signaturverifizierung, direkt zum Testen verfügbar:

- **OP** (OpenID Provider, Identitätsprovider) — `/.well-known` + Autorisierungs- / Token- / JWKS-Endpunkte
- **RP** (Relying Party, Client) — verbindet jeden beliebigen externen OP, JWKS-Signaturverifizierung
- **RS** (Resource Server, geschützte API) — validiert bearer-Token Scopes
- **SAML IdP / SP** (Identitätsprovider / Dienstprovider) — umhüllte Signaturen, ACS-Signaturverifizierung-Demo

👉 [Siehe Mock-Demo und Endpunkt-Dokumentation](/de/mock/)

## Protokolldokumentation

- Wollen Sie **Enterprise Single Sign-On** (SSO) verstehen? Beginnen Sie mit [SAML 2.0-Übersicht](/de/saml/).
- Wollen Sie **Autorisierung für APIs** implementieren? Siehe [OAuth 2.0-Übersicht](/de/oauth2/).
- Wollen Sie **"Mit XX-Konto anmelden"** implementieren? Siehe [OIDC-Übersicht](/de/oidc/).
- Wollen Sie **passwortlose / phishing-resistente Anmeldung** (Passkey) implementieren? Siehe [WebAuthn-Übersicht](/de/webauthn/).
- Wollen Sie **zweiten Faktor** (dynamische Verifizierungscodes) hinzufügen? Siehe [MFA / TOTP-Übersicht](/de/mfa/).
