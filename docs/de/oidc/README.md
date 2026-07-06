---
title: "OIDC Übersicht"
---

# OIDC Übersicht

OpenID Connect (OIDC) ist eine **Authentifizierungsebene** (Identity Layer), die auf OAuth 2.0 aufbaut. Eine knappe Zusammenfassung der Aufgabenverteilung:

> **OAuth 2.0 kümmert sich um Autorisierung (Authorization), OIDC ergänzt die Authentifizierung (Authentication).**

Das Problem, das OAuth 2.0 löst, ist: "Wie kann Anwendung A mit Genehmigung des Benutzers auf Ressourcen des Benutzers auf Service B zugreifen?" Das Produkt ist ein access token (Zugriffsverweis) — ein "Ressourcenzugriffsverweis". Aber OAuth 2.0 selbst beantwortet die Frage **"Wer ist der aktuelle Benutzer?"** nicht. OIDC überlagert den Autorisierungsablauf von OAuth 2.0 mit einem standardisierten Identitätsmechanismus. Das Kernprodukt ist das **ID Token** (Identitätsverweis) — ein JWT (JSON Web Token, ein selbstkontainiertes, signaturverifizierbares Tokenformat), das vom Identitätsanbieter signiert ist und Informationen wie "wer, wann, bei welchem IdP und für welchen Client eine Authentifizierung durchgeführt hat" enthält.

## OIDC im Protokollstapel

```
┌─────────────────────────────────────┐
│  OIDC  (Authentifizierung: Wer bist du?)           │
├─────────────────────────────────────┤
│  OAuth 2.0  (Autorisierung: Was darf ich tun?)    │
├─────────────────────────────────────┤
│  HTTP / TLS                         │
└─────────────────────────────────────┘
```

OIDC nutzt die Endpunkte (authorization endpoint, token endpoint), Flows (Autorisierungscode-Flow usw.) und Sicherheitsmechanismen (state, redirect_uri-Validierung) von OAuth 2.0 wieder, mit nur wenigen Erweiterungen:

- Beim Autorisierungsanfrage wird `openid` zum `scope` hinzugefügt, um signalisieren, dass es eine Authentifizierungsanfrage ist;
- Die Token-Antwort enthält zusätzlich zu `access_token` auch `id_token`;
- Neue Infrastrukturen wie UserInfo Endpoint (Benutzerinformationsendpunkt) und Discovery (Erkennungsmechanismus) werden hinzugefügt.

Falls Sie bereits mit OAuth 2.0 vertraut sind (siehe [OAuth 2.0-Dokumentation](../oauth2/)), sind die inkrementellen Kosten für das Erlernen von OIDC sehr gering.

## Spezifikationsfamilie

OIDC ist nicht eine einzelne Spezifikation, sondern eine Gruppe von Spezifikationen:

| Spezifikation | Zweck |
|------|------|
| **OpenID Connect Core 1.0** | Kernspezifikation: definiert ID Token, Authentifizierungsanfrage/-antwort, drei Flows, UserInfo Endpoint, Standard-Claims |
| **OpenID Connect Discovery 1.0** | Definiert das Metadaten-Dokument `/.well-known/openid-configuration`, mit dem RP automatisch die Endpunkte und Fähigkeiten des OP erkennt |
| **OpenID Connect Dynamic Client Registration 1.0** | Ermöglicht es Clients, sich dynamisch über eine API zu registrieren, statt manuell in der Konsole |
| **OpenID Connect RP-Initiated Logout 1.0** | Von RP eingeleitetes Abmelden: Browser wird zu `end_session_endpoint` des OP umgeleitet, um die OP-Sitzung zu beenden |
| **OpenID Connect Session Management 1.0** | Sitzungszustandsüberwachung basierend auf iframe-Polling (RP erfährt von Änderungen der OP-Sitzung) |
| **OpenID Connect Front-Channel Logout 1.0** | Front-Channel-Abmeldung: OP benachrichtigt jeden RP über Browser-iframe, um Sitzungen zu bereinigen |
| **OpenID Connect Back-Channel Logout 1.0** | Back-Channel-Abmeldung: OP benachrichtigt RP über direkte Server-zu-Server-Aufrufe (mit Logout Token), nicht vom Browser abhängig |

In der Ingenieurpraxis ist die häufigste Kombination **Core + Discovery + RP-Initiated Logout**. Single Sign-out-Szenarien erfordern Front/Back-Channel Logout nach Bedarf (Back-Channel ist zuverlässiger, nicht durch Third-Party-Cookie-Beschränkungen beeinträchtigt).

## Warum man kein nacktes OAuth 2.0 zum Anmelden verwenden sollte

Vor der Standardisierung von OIDC wurde "Drittanbieter-Login" oft so implementiert: Man führte einen OAuth 2.0-Flow durch, erhielt einen access token und rief dann eine private "Benutzerinformationen abrufen"-API auf. Die Benutzer-ID aus der Antwort wurde als Identität behandelt. Dieser Ansatz hat grundlegende Mängel:

::: danger access token ist keine Identitätsbescheinigung
**Die Semantik eines access tokens ist "dem Halter ist erlaubt, diese Ressource zu nutzen", nicht "der Halter ist der Ressourceneigentümer selbst".**

Ein typischer Angriff (Token-Substitution): Ein Angreifer verleitet das Opfer auf einer böswilligen Anwendung A zu einer OAuth-Genehmigung und erhält das access token des Opfers. Dann reicht der Angreifer diesen Token dem anfälligen Login-Interface von Anwendung B ein. Anwendung B nutzt den Token zum Abruf von Benutzerinformationen und findet die Daten des Opfers, wodurch die Sitzung des Angreifers als Opfer angemeldet wird.

Die Wurzel des Problems: **Der access token enthält keine Audience-Information**, so dass Anwendung B nicht beurteilen kann, "ob dieser Token mir ausgegeben wurde oder jemandem anderen".
:::

Das ID Token von OIDC beseitigt diese Probleme durch Design:

- Der `aud` Claim bindet den Ziel-Client; RP muss validieren, dass `aud` gleich der eigenen `client_id` ist, fremde Tokens werden sofort abgelehnt;
- Der `iss` Claim zeigt den Aussteller; zusammen mit Signaturverifizierung kann bestätigt werden, dass das Token wirklich vom vertrauenswürdigen OP stammt und nicht manipuliert wurde;
- `nonce` bindet das Token an eine spezifische Authentifizierungssitzung, wodurch Replay-Angriffe verhindert werden;
- `exp`/`iat`/`auth_time` bieten Gültigkeits- und Authentifizierungszeit-Informationen.

Außerdem haben die verschiedenen "Benutzerinformations-APIs" bei unterschiedlichen Anbietern sehr unterschiedliche Feldstrukturen. OIDC standardisiert dies mit Standard-Claims (`sub`, `name`, `email` usw.), so dass derselbe RP-Code mit jedem konformen OP kommunizieren kann.

## Einsatzszenarien

- **Web-Anwendungen / SPA / Mobile Apps-Anmeldung**: Verbindung zu Unternehmens-IdP (wie Keycloak, Azure AD / Entra ID, Okta) oder Social-Login (Google, Apple usw.).
- **Single Sign-On (SSO)**: Mehrere Anwendungen teilen die Anmeldesitzung desselben OP; einmal anmelden, überall verfügbar.
- **Anmeldung + API-Autorisierung in einem**: Ein Autorisierungscode-Flow stellt gleichzeitig ID Token (Anmeldung) und access token (Backend-API-Aufruf) bereit — ein klarer Vorteil von OIDC gegenüber SAML.
- **Microservices / Cloud-native-System mit einheitlicher Identität**: Service-Gateway validiert JWT, Identitätsinformationen werden mit Anfragen weitergeleitet.
- **CIAM (Customer Identity Management)**: Registrierungs- und Anmeldesystem für Millionen von Endbenutzern.

## OIDC vs. SAML

SAML 2.0 (Security Assertion Markup Language, ein XML-basiertes Identitätsföderation-Protokoll) ist der De-facto-Standard für Enterprise-SSO der vorherigen Generation. Ähnliche Position, aber unterschiedliches Temperament:

| Dimension | OIDC | SAML 2.0 |
|------|------|----------|
| Datenformat | JSON / JWT | XML (mit XML-DSig zum Signieren, komplex und fehleranfällig) |
| Transport | REST / HTTP-Umleitungen | HTTP POST/Redirect Binding, SOAP (Artifact) |
| Token | ID Token (JWT) | SAML Assertion (XML) |
| Mobile / SPA-Unterstützung | Nativ freundlich | Schwach; grundsätzlich nur für Browser-Web-Apps geeignet |
| API-Autorisierung | Eingebaut (wiederverwendet OAuth2 access token) | Nein; benötigt zusätzlich OAuth2 |
| Metadaten / Erkennung | Discovery-Dokument (JSON) | SAML Metadata (XML) |
| Ökosystem | Moderne Anwendungen, Cloud-Services, Mobile, CIAM | Legacy-Enterprise-Systeme, ältere SaaS |
| Typische Wahl | Neue Systeme — immer priorisieren | Nur wenn der Gegenüber (normalerweise Legacy-Software) ausschließlich SAML unterstützt |

Einfache Entscheidung: **Für neue Projekte OIDC wählen; nur dann SAML verwenden, wenn der Gegenüber nur SAML unterstützt.** Siehe [SAML-Dokumentation](../saml/) in diesem Projekt.

## Navigation dieses Kapitels

- [Kernkonzepte](./concepts.md) —— OP/RP-Rollen, ID-Token-Struktur und Validierung, Standard-Scopes und Claims, Discovery, JWKS, Abmeldemechanismen
- [Typische Flows](./flows.md) —— Schritt-für-Schritt-Beispiel des Autorisierungscode-Flows, Vergleich dreier response_type, Discovery/JWKS-Abruf, RP-Initiated Logout
- [Typische Parameter und Claims-Referenz](./reference.md) —— Authentifizierungsanfrageparameter, ID-Token-Claims, Standard-Claims, prompt-Werte, Fehlercodes und Troubleshooting-Schnelleinsicht

::: tip Voraussetzungen
Es wird empfohlen, zuerst die [OAuth 2.0-Dokumentation](../oauth2/) zu lesen, um die Grundlagen wie Autorisierungscode-Flow, PKCE und state zu beherrschen, bevor Sie dieses Kapitel betreten.
:::
