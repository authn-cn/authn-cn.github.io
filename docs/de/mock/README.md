---
title: Mock-Server
---

# Mock-Authentifizierungsserver

**Service-Adresse: <https://mock.authn.tech/>**

Dies ist ein **Einsatzbereiter Online-Mock-Authentifizierungsdienst**, bereitgestellt auf Cloudflare Workers. Authentifizierungs-/Autorisierungsprozesse erfordern normalerweise die Zusammenarbeit mehrerer Rollen (Tokensaussteller, Tokenkonsumenten, geschützte APIs...), es ist mühsam, sie alle selbst aufzubauen. Dieses Mock implementiert alle diese Rollen fertig und stellt sie ins öffentliche Netz, Sie können:

- **Gemeinsame Entwicklung**: Bei der Client-Entwicklung ist es nicht notwendig, zunächst einen Keycloak / ADFS einzurichten, verbinden Sie sich direkt mit dem Mock dieser Seite; umgekehrt können auch nur Backend-Entwickler den Mock-Client dieser Seite verwenden, um Ihren Service zu testen.
- **Integrationstests**: In CI mit festen, vorhersehbaren Antworten Ihren Authentifizierungsintegrationscode validieren (Anhängen von `&user=alice` ermöglicht Skripte ohne Interaktion).
- **Lernen und Üben**: In Kombination mit [Protokoll-Dokumentation](../oidc/) können Sie beobachten, wie jeder Schritt der Nachricht aussieht.

## Rollen und Terminologie

Nutzen Sie die vier Rollennamen, wie von **OAuth 2.0 (RFC 6749)** definiert; **OIDC** (OpenID Connect Core) und **SAML 2.0** sind nur unterschiedliche Benennungen derselben Rollen. Die folgende Tabelle reiht nach "gleiche Rolle, unterschiedliche Benennungen in verschiedenen Spezifikationen":

| OAuth 2.0 (RFC 6749) | OIDC | SAML 2.0 | Deutsch / Verantwortung | Dieses Mock |
|------|------|------|------|------|
| Resource Owner | End-User | Principal (Subject) | Ressourceneigentümer / Endbenutzer, erteilt Zustimmung | Test-Benutzer alice / bob |
| Authorization Server | OpenID Provider (OP) | Identity Provider (IdP) | Aussteller: verifiziert Identität, stellt Token / Assertion aus | `/oidc/*`, `/saml/idp/*` |
| Client | Relying Party (RP) | Service Provider (SP) | Konsument: initiiert Login, validiert Token / Assertion | `/rp/`, `/saml/sp/*` |
| Resource Server | Resource Server | —— | Ressourcenserver / geschützte API | `/rs/api` |

> RFC 6749 nutzt die Namen **Resource Owner / Client / Authorization Server / Resource Server**. OIDC nennt Authorization Server **OP**, Client **RP**; SAML nennt es **IdP / SP** — alle sind Aliase derselben Rollen. Unter diesen ist **Resource Owner eine Person** (kein ansprechbarer Dienst), diese Site wird durch die Auswahlseite mit alice / bob dargestellt. Daher besprechen wir im Folgenden nur die ansprechbaren Dienstollen.

Die Rollen, Endpunkte und Aufrufschritte auf beiden Seiten sind:

- 🔷 [**OIDC / OAuth2 Mock**](./oidc.md) —— OP / RP / RS drei Rollen + Autorisierungscode + PKCE Aufruffolge
- 🔶 [**SAML Mock**](./saml.md) —— IdP / SP zwei Rollen + Web Browser SSO Aufruffolge
- 📬 [**Mail-Server**](./mail.md) —— Empfangen Sie `@authn.tech` E-Mails mit Email Routing, zeigen Sie online / API an und extrahieren Sie Einmal-Verifizierungscodes
- 🗂 [**LDAP-Verzeichnis**](./ldap.md) —— HTTP/JSON-Verzeichnissuche-Emulator, wertet RFC 4515-Filter gegen ein Beispielverzeichnis aus (nicht das echte LDAP-Protokoll)

::: danger Nur zum Testen
Die Signaturprivatsschlüssel sind öffentlich im [Quellcode](https://github.com/authn-cn/authn-mock) verfügbar, jeder kann von diesem Service ausgegebene Token / Assertions fälschen; Autorisierungscodes garantieren nicht Einzelnutzung (zustandslose Implementierung). **Kein Produktionssystem sollte Assertions oder Token dieses Mock-Services vertrauen.**
:::

## Mischen: Ersetzen Sie einen Teil durch Ihren eigenen Service

Der Wert des Mock liegt in **nur mocken Sie den Teil, den Sie noch nicht haben**, nutzen Sie Ihren echten Service für den Rest. Häufige Kombinationen:

| Was Sie bereits haben | Nutzen Sie Mock um | Wie zu verbinden |
|----------|--------------|--------|
| RP / Client | **Mock OP** | Richten Sie issuer des RP auf `https://mock.authn.tech` (automatische Erkennung `/.well-known/openid-configuration`) |
| OP / Autorisierungsserver | **Mock RP** | Öffnen Sie [`/rp/`](https://mock.authn.tech/rp/) Konsole, geben Sie Ihren issuer und `client_id` ein, und whitelist Sie `…/rp/callback` |
| OP hinter Unternehmensnetz / WAF | **Mock RP (manuell)** | Öffnen Sie [`/rp/manual`](https://mock.authn.tech/rp/manual) — Ihr eigener Browser stellt jede Anfrage an den OP, diese Site parst und verifiziert nur offline ([Details](./oidc.md#manueller-schritt-für-schritt-modus-op-hinter-unternehmensnetz-waf)) |
| Geschützte API aber fehlende Token-Quelle | **Mock OP** | Nutzen Sie Mock OP mit `client_credentials` oder Autorisierungscode um `access_token` zu erhalten, verwenden Sie es dann mit Ihrer API |
| API-Client aber fehlende geschützte Ressource | **Mock RS** | Verwenden Sie Token, die von Mock OP signiert wurden, auf [`/rs/api`](https://mock.authn.tech/rs/), validieren Sie Ihres Clients 401 / 403 Behandlung |
| SP / vertrauenswürdige Anwendung | **Mock IdP** | Importieren Sie [`/saml/idp/metadata`](https://mock.authn.tech/saml/idp/metadata) in Ihren SP |
| IdP | **Mock SP** | Konfigurieren Sie Ihr IdP-Metadata auf Mock SP, oder nutzen Sie IdP-initiiert zu Mock SP ACS |

Einheitliche Idee: **Aussteller (OP / IdP) und Konsument (RP / SP) erscheinen immer paarweise**, ergänzen Sie den fehlenden Teil, lassen Sie Mock mit Ihrem echten Service verbinden, Sie können den kompletten Prozess durchlaufen.

Implementierungsfortschritt und Anforderungen sind willkommen auf [GitHub](https://github.com/authn-cn/authn-mock).
