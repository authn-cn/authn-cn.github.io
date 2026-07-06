---
title: "SAML 2.0 Überblick"
---

# SAML 2.0 Überblick

## Was ist SAML

SAML (Security Assertion Markup Language) ist ein offener XML-basierter Standard zur Austausch von Authentifizierungs- und Autorisierungsdaten zwischen verschiedenen Sicherheitsbereichen. Er wird von OASIS (Organization for the Advancement of Structured Information Standards) entwickelt, und die heute weit verbreitete Version ist **SAML 2.0**, veröffentlicht im März 2005.

Das Kernproblem, das SAML löst: **Wie kann System B sicher darauf vertrauen, dass ein Benutzer sich bereits in System A authentifiziert hat, ohne dass das Passwort an System B weitergegeben wird?** Es ist der De-facto-Standard für Enterprise-Single-Sign-On (SSO) und bleibt die bevorzugte Methode für viele SaaS-Produkte zur Integration mit Unternehmensidentitätssystemen.

Das grundlegende Arbeitsmodell von SAML:

1. Der **Identitätsanbieter** (IdP, Identity Provider) authentifiziert den Benutzer und stellt ein digital signiertes XML-Dokument aus — die **Assertion** — die besagt: „Ein bestimmter Benutzer hat sich zu einem bestimmten Zeitpunkt auf bestimmte Weise authentifiziert und hat bestimmte Attribute."
2. Der **Diensteanbieter** (SP, Service Provider) empfängt und validiert diese Assertion (Signatur, Gültigkeitsdauer, Zielgruppe) und erstellt dann eine lokale Benutzersitzung.

Da die Assertion die XML-Digitalsignatur des IdP trägt, kann der SP ihre Authentizität und Integrität offline überprüfen — ohne Echtzeitkommunikation mit dem IdP (insbesondere im häufig verwendeten POST Binding). Dies ist ein wichtiges Merkmal der SAML-Architektur.

## Historische Entwicklung: SAML 1.0 / 1.1 → 2.0

| Version | Veröffentlichung | Beschreibung |
|---------|------------------|---------|
| SAML 1.0 | November 2002 | Erste OASIS-Version, etabliert grundlegend Assertion/Protocol/Binding-Rahmen |
| SAML 1.1 | September 2003 | Kleine Überarbeitungen, in frühen föderalen Identitätsbereitstellungen verwendet |
| SAML 2.0 | März 2005 | Großes Update, **nicht abwärtskompatibel mit 1.1** |

SAML 2.0 vereint drei technische Ansätze: SAML 1.1 selbst, Liberty Alliances **ID-FF 1.2** (Identity Federation Framework) und praktische Erfahrungen von Shibboleth 1.3. Wichtigste Verbesserungen gegenüber 1.1:

- Neue standardisierte `<AuthnRequest>`-Nachricht in **SP-initiated SSO** (1.1 definierte nur von IdP initiierte Vorgänge);
- Neues **Single-Logout** (SLO)-Protokoll;
- Neue **Metadaten**-Spezifikation für standardisierte Austausch von Endpunkten und Zertifikaten zwischen SP und IdP;
- Einführung von **NameID Format** (persistente/transiente Identifikatoren) und NameID-Verwaltungsprotokoll zum Schutz von Privatsphäre in Föderationsszenarien;
- Unterstützung für **XML-Verschlüsselung** von Assertions, NameIDs und Attributen.

::: tip
Heute werden neue Integrationen sehr selten mit SAML 1.1 durchgeführt. Bei Legacy-Systemen mit SAML-1.1-only-Unterstützung sollte ein Upgrade angestrebt werden. Die beiden Versionen haben inkompatible Nachrichtenformate und Namensräume (`urn:oasis:names:tc:SAML:1.0:*` vs `urn:oasis:names:tc:SAML:2.0:*`).
:::

## Zusammensetzung der OASIS-Standarddokumentation

SAML 2.0 ist nicht ein einzelnes Dokument, sondern ein Satz von Spezifikationen. Die vier am häufigsten consultierten Kerndokumente sind:

| Dokument | Kurzform | Inhalt |
|----------|----------|--------|
| Assertions and Protocols | **Core** (saml-core-2.0-os) | Definiert die Struktur von Assertions (drei Statement-Typen) und Protokollnachrichten (`AuthnRequest`, `Response`, `LogoutRequest` usw.) mit XML-Schema und Verarbeitungsregeln |
| Bindings | **Bindings** (saml-bindings-2.0-os) | Definiert, wie Protokollnachrichten auf die Transportschicht abgebildet werden: HTTP-Redirect, HTTP-POST, HTTP-Artifact, SOAP usw. |
| Profiles | **Profiles** (saml-profiles-2.0-os) | Kombiniert Core + Bindings zu interoperablen vollständigen Anwendungsfällen, wichtigste sind Web Browser SSO Profile und Single Logout Profile |
| Metadata | **Metadata** (saml-metadata-2.0-os) | Definiert das Metadatenformat `EntityDescriptor` zur Austausch von Entitätsidentifikatoren, Endpunktadressen und Zertifikaten |

Die vier Schichten können zusammengefasst werden: **Core definiert „was sagen", Bindings definiert „wie übertragen", Profiles definiert „wie ein kompletter Dialog abläuft", Metadata definiert „wie Konfigurationen ausgetauscht werden"**. Diese Konzepte werden auf der [Kernkonzepte](./concepts.md)-Seite ausführlich erläutert.

Es gibt auch Nebenspezifikationen wie Conformance (Konformitätsanforderungen), Security and Privacy Considerations (Sicherheitsüberlegungen) und Authentication Context (Authentifizierungskontext), die beim Debugging und bei Sicherheitsbewertungen nützlich sind.

## Typische Anwendungsszenarien

Der typischste und praktisch einzige noch wachsende Anwendungsfall für SAML 2.0 ist **Enterprise Web SSO / Identitätsförderung**:

- **Enterprise-internes SSO**: Mitarbeiter melden sich einmalig bei dem unternehmenseigenen IdP an (z.B. AD FS, Keycloak, Ping, Okta, Azure AD / Entra ID) und können dann auf alle internen Web-Anwendungen zugreifen.
- **Unternehmensanbindung an SaaS**: Wenn Unternehmen SaaS wie Salesforce, Workday, Jira kaufen, ermöglicht SAML Mitarbeitern, sich mit ihrem Unternehmenskonto anzumelden, wobei die Kontoverwaltung zentral erfolgt (üblicherweise kombiniert mit SCIM für Kontosynchronisation).
- **Cross-Organisation-Verbund**: Hochschulverbünde (wie eduGAIN/Shibboleth-Systeme), gegenseitige Anerkennung von Identitäten zwischen Behörden und Unternehmen.

### Positionierung im Vergleich zu OAuth 2.0 / OIDC

| Dimension | SAML 2.0 | OAuth 2.0 | OIDC (OpenID Connect) |
|-----------|----------|-----------|----------------------|
| Gelöst Problem | Authentifizierung + Attributweiterleitung (SSO) | **Autorisierung** (delegierter API-Zugang) | Authentifizierung (auf OAuth 2.0 aufgebaut) |
| Nachrichtenformat | XML (Signatur/Verschlüsselung nutzt XML-DSig/XML-Enc) | JSON / Formularparameter | JSON, Token als JWT |
| Hauptbeglaubigung | Assertion | Access Token | ID Token (+ Access Token) |
| Client-Typ | Traditionelle Web-Anwendungen (Browser-Umleitung/POST) | Web, Mobile, SPA, Dienst-zu-Dienst | Web, Mobile, SPA |
| Mobile/API-Freundlichkeit | Schlecht | Gut | Gut |
| Enterprise-SaaS-Unterstützung | Sehr reif | — (nicht zur Anmeldung) | Schnell verbreitet |
| Typische Auswahl | Integration mit bestehendem Enterprise-IdP, SaaS-Unternehmensversion-Anmeldung | Offene API-Autorisierung | SSO für neue Systeme ist erste Wahl |

::: tip Auswahlempfehlungen
Neue Systeme bevorzugen OIDC; aber wenn Ihr Produkt mittelgroße bis große Unternehmen ansprechen soll, können Sie SAML wahrscheinlich nicht vermeiden — viele Unternehmens-IdPs und Compliance-Prozesse sind immer noch SAML-zentriert. Beide sind nicht gegensätzlich; ein gängiger Ansatz ist, eine Zwischenschicht wie Keycloak zu verwenden, um Protokolle zu überbrücken (OIDC intern, SAML extern).
:::

## Navigationsführer für dieses Kapitel

- [Kernkonzepte](./concepts.md) — Rollen, Assertion, Protocol, Binding, Profile, Metadata, NameID, Signierung und Verschlüsselung
- [Typische Flows](./flows.md) — SP-initiated SSO, IdP-initiated SSO, Single Logout mit Schritt-für-Schritt-Anleitung und vollständigen Nachrichtenbeispielen
- [Typische Parameter und Nachrichtenreferenz](./reference.md) — AuthnRequest/Response Schnellreferenz, StatusCode, NameID Format, Troubleshooting-Schnellreferenz
