---
title: "OAuth 2.0 Übersicht"
---

# OAuth 2.0 Übersicht

OAuth 2.0 ist das derzeit am weitesten verbreitete **Autorisierungs(Authorization)-Framework** im Internet, definiert durch [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749). Das zentrale Problem, das es löst, ist: **Wie kann eine Drittanwendung auf geschützte Ressourcen eines Benutzers zugreifen, ohne das Passwort des Benutzers zu erhalten**.

## Welches Problem löst OAuth 2.0?

Stellen Sie sich ein Szenario vor: Eine Terminplanungs-App möchte Ihren Google-Kalender lesen. Vor OAuth war es üblich, dass Benutzer ihre Google-Kontodaten direkt an diese App weitergeben — das bedeutet:

- Die App erhält **alle Ihre Berechtigungen**, nicht nur den Lesezugriff auf Ihren Kalender;
- Die App muss **Ihr Passwort im Klartext speichern**;
- Sie können nicht nur diese eine App sperren, sondern müssen Ihr Passwort ändern, was alle Apps gleichzeitig deaktiviert;
- Der Dienst kann nicht unterscheiden, ob Sie persönlich tätig sind oder eine Drittanwendung.

OAuth 2.0 ersetzt das Passwort durch **Token(s)**: Nachdem sich ein Benutzer auf dem Autorisierungsserver (z.B. Google) angemeldet und dem Autorisierungsumfang explizit zugestimmt hat, erhält die Drittanwendung einen **Access Token (Zugangstoken)** mit begrenzten Berechtigungen, der einzeln widerrufen werden kann und ein Ablaufdatum hat. Damit wird auf die Ressource zugegriffen.

::: warning OAuth ist Autorisierung, nicht Authentifizierung
Das ist die häufigste Verwechslung von Konzepten. OAuth 2.0 beantwortet die Frage „**Darf diese App im Namen des Benutzers auf eine bestimmte Ressource zugreifen**" (Autorisierung, Authorization), nicht „**Wer ist der aktuelle Benutzer**" (Authentifizierung, Authentication).

Der Access Token selbst enthält keine verlässliche Semantik für „Benutzer ist angemeldet" — einen Token zu haben bedeutet nicht, dass die Benutzeridentität nachgewiesen ist (der Token könnte z.B. für eine andere App ausgestellt und injiziert worden sein). Die direkte Verwendung von OAuth als Login-Protokoll führt zu Sicherheitslücken. **Für Authentifizierung/Login sollten Sie OpenID Connect (OIDC) verwenden, das auf OAuth 2.0 aufgebaut ist**. Es bietet cryptographisch geschützte Identitätsbestätigungen durch ID Token.
:::

## Entwicklungsgeschichte

| Zeitpunkt | Ereignis |
|------|------|
| 2007 | OAuth 1.0 veröffentlicht. Basiert auf Anfrage-Signatur (HMAC-SHA1), nicht benutzerfreundlich für Entwickler, Signaturimplementierung fehleranfällig |
| 2010 | OAuth 1.0a behebt Session-Fixierung-Anfälligkeit, wird später RFC 5849 |
| 2012 | **OAuth 2.0 veröffentlicht (RFC 6749 Framework + RFC 6750 Bearer Token)**. Verzichtet auf Anfrage-Signatur, nutzt stattdessen TLS + Bearer Token, vereinfacht die Implementierung erheblich; der Nachteil ist, dass die Sicherheit stärker von korrekten Deployment-Praktiken abhängt |
| 2015 | RFC 7636 (PKCE) veröffentlicht, ursprünglich für öffentliche Clients wie Mobile Apps entwickelt, später für alle Clients empfohlen |
| 2019 bis heute | **OAuth 2.1 Entwurf** (draft-ietf-oauth-v2-1) in Entwicklung: integriert 2.0 + PKCE + Best Practices, **entfernt Implicit und Password Grant Types**, macht PKCE und redirect_uri exakte Übereinstimmung obligatorisch |
| 2025 | RFC 9700 (OAuth 2.0 Security Best Current Practice) veröffentlicht, etabliert offiziell moderne Sicherheitsbasislinie |

OAuth 2.0 ist ein **Framework** und kein einzelnes Protokoll: Die Kernspezifikation lässt absichtlich Erweiterungspunkte offen (Grant Types, Token-Formate, Client-Authentifizierungsmethoden), die durch nachfolgende RFCs schrittweise ergänzt werden.

## RFC-Kartografie der Kernstandards

| RFC | Name | Zweck |
|-----|------|------|
| [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) | The OAuth 2.0 Authorization Framework | Kern-Framework: Rollen, Grant Types, Endpoints, Fehlercodes |
| [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750) | Bearer Token Usage | Wie Access Token in HTTP-Anfragen mitgeführt werden |
| [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636) | PKCE | Cryptographischer Nachweis für Code-Austausch, verhindert Code-Abfangung |
| [RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628) | Device Authorization Grant | Autorisierungsfluss für Eingabe-begrenzte Geräte wie TVs und CLIs |
| [RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009) | Token Revocation | Endpoint für Clients zum aktiven Widerrufen von Tokens |
| [RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662) | Token Introspection | Resource Server abfragen Token-Status und Metadaten |
| [RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414) | Authorization Server Metadata | Autorisierungsserver-Konfiguration Auto-Discovery (`/.well-known/oauth-authorization-server`) |
| [RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700) | Security Best Current Practice | Moderne Sicherheitsbasislinie: Erzwingt PKCE, verwirft Implicit/Password etc. |

Weitere verwandte Standards: RFC 7519 (JWT), RFC 9068 (JWT-Format Access Token), RFC 8705 (mTLS Client-Authentifizierung), RFC 9126 (PAR, Pushed Authorization Requests).

## Anwendungsszenarien

- **Integration von Drittanwendungen**: Lassen Sie externe Apps mit begrenztem Umfang auf Benutzerdaten auf Ihrer Plattform zugreifen (typisches offenes Plattform-API).
- **Eigene Produkte mit Frontend/Backend-Trennung / Mobile App**: SPA und Mobile-Clients erhalten API-Zugriff über Authorization Code + PKCE.
- **Microservices / Machine-to-Machine (M2M)**: Service-to-Service-Aufrufe verwenden Client Credentials Mode, kein Benutzer beteiligt.
- **Eingabe-begrenzte Geräte**: Smart-TVs, IoT-Geräte, CLI-Tools verwenden Device Flow.
- **Als Grundlage für OIDC**: Single Sign-On (SSO), Social Login sind im Grunde OIDC, aufgebaut auf OAuth 2.0.

Nicht geeignet oder vorsichtig: Reine „Benutzer-Login"-Anforderungen sollten OIDC direkt verwenden; auch hochvertrauenswürdige Szenarien sollten nicht auf den deprecated Password Mode zurückfallen (siehe [Typische Flows](./flows.md)).

## Positionierung im Vergleich zu SAML / OIDC

| Dimension | OAuth 2.0 | OIDC | SAML 2.0 |
|------|-----------|------|----------|
| Problem | **Autorisierung** (Delegierter API-Zugriff) | **Authentifizierung** (Wer ist der Benutzer) + Autorisierung | Authentifizierung + Enterprise SSO |
| Datenformat | JSON / Form-kodiert | JSON (JWT) | XML |
| Token | Access Token, Refresh Token | Plus ID Token (JWT) | SAML Assertion |
| Typisches Szenario | API-Zugriff, offene Plattform, M2M | Social Login, Mobile/SPA-Login, modernes SSO | Traditionelles Enterprise-internes SSO (Integration mit Altsystemen) |
| Mobile-freundlichkeit | Gut | Gut | Schlecht |
| Veröffentlichungsjahr | 2012 | 2014 | 2005 |

Einfach zu merken: **SAML ist der vorherige Generation Enterprise SSO; OAuth 2.0 verwaltet API-Autorisierung; OIDC = OAuth 2.0 + Identitätsschicht, ist die Standard-Wahl für modernes Login**.

## Navigation dieses Kapitels

- [Kernkonzepte](./concepts.md) — Rollen, Client-Typen, Token, Scope, Endpoints, State und PKCE
- [Typische Flows](./flows.md) — Authorization Code (+PKCE), Client Credentials, Device Flow, Refresh Token und deprecated Flows
- [Typische Parameter und Antwort-Referenz](./reference.md) — Parametertabelle, Fehlercode-Tabelle, Troubleshooting Quick Reference

::: tip Leseempfehlung
Für Anfänger wird empfohlen, in dieser Reihenfolge zu lesen: Konzepte → Flows → Referenz; erfahrene Leser können die [Referenzseite](./reference.md) direkt als Schnellreferenz verwenden.
:::
