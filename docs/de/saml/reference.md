---
title: "Typische Parameter und Nachrichtenreferenz"
---

# Typische Parameter und Nachrichtenreferenz

Diese Seite ist eine Schnellreferenz-Tabelle, nach Nachrichtentyp organisiert. Flow-Kontext siehe [Typische Flows](./flows.md), Konzepterklärungen siehe [Kernkonzepte](./concepts.md).

## AuthnRequest Schlüsselelemente und Attribute

| Element/Attribut | Erforderlich | Beschreibung |
|------------------|-------------|---------|
| `ID` | Ja | Request eindeutige Kennung (NCName, darf nicht mit Zahl beginnen, Konvention `_` Präfix). SP muss speichern, zum Abgleich von Response `InResponseTo` |
| `Version` | Ja | Fest `2.0` |
| `IssueInstant` | Ja | Ausstellungszeit, UTC ISO 8601 (wie `2026-07-03T08:29:55Z`). IdP lehnt Anfragen mit zu großer Abweichung ab |
| `Destination` | Empfohlen | IdP SSO Endpunkt URL. Wenn Nachricht signiert, muss IdP überprüfen, dass es mit empfangener Adresse übereinstimmt |
| `AssertionConsumerServiceURL` | Empfohlen | Erwartete ACS-Adresse zur Response-Rückgabe. IdP muss überprüfen, dass es in SP-Metadaten registriert ist, sonst könnte es zur Assertion-Diebstahl missbraucht werden |
| `ProtocolBinding` | Optional | Erwartetes Response Binding, normalerweise `urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST` |
| `AssertionConsumerServiceIndex` | Optional | Nutze Index statt explizite URL (gegenseitig ausschließlich) |
| `ForceAuthn` | Optional | Wenn `true`, fordere IdP auf, existierende Sitzung zu ignorieren, erzwinge Neauthentifizierung (häufig vor sensitiven Operationen) |
| `IsPassive` | Optional | Wenn `true`, verbiete IdP mit Benutzer zu interagieren; ohne Sitzung gebe `NoPassive` Fehler (zum stillen Prüfen von Anmeldestatus) |
| `<Issuer>` | Ja | SP Entity ID |
| `<NameIDPolicy>` | Optional | `Format` deklariert erwartete NameID-Format; `AllowCreate="true"` erlaubt IdP neue Identifikatoren für neue Benutzer zu erstellen |
| `<RequestedAuthnContext>` | Optional | Geforderte Authentifizierungsstärke, enthält eine oder mehrere `<AuthnContextClassRef>`; `Comparison` ist `exact`/`minimum`/`maximum`/`better` |
| `<Scoping>` / `<ProxyCount>` | Optional | Proxy/Weiterleitungs IdP Szenarien, seltener genutzt |

## Response und Assertion Struktur

### Response äußere Schicht

| Element/Attribut | Beschreibung |
|------------------|---------|
| `ID` / `Version` / `IssueInstant` | Wie oben, `ID` für Log-Zuordnung und Wiederholungsschutz |
| `InResponseTo` | Entspricht AuthnRequest `ID`. **Existiert nicht in IdP-initiated Flow** |
| `Destination` | SP ACS URL, SP muss überprüfen, dass es sich selbst gleicht |
| `<Issuer>` | IdP Entity ID |
| `<samlp:Status>` | Verarbeitungsergebnis, siehe unten StatusCode Tabelle |
| `<saml:Assertion>` oder `<saml:EncryptedAssertion>` | Bei Erfolg Assertion (0..n, Web SSO normalerweise genau 1); bei Fehler möglicherweise keine |

### Status

| Element | Beschreibung |
|---------|---------|
| `<StatusCode Value="...">` | Top-Level Status Code (siehe unten Tabelle), kann genestete zweite StatusCode zur Verfeinerung der Ursache enthalten |
| `<StatusMessage>` | Für Menschen lesbare Info, beim Debugging zuerst ansehen |
| `<StatusDetail>` | Maschinen-lesbare zusätzliche Details |

### Subject und SubjectConfirmation (bearer)

| Element/Attribut | Beschreibung |
|------------------|---------|
| `<NameID>` | Hauptakteur-Kennung, `Format` siehe unten Übersichtstabelle |
| `<SubjectConfirmation Method>` | Web SSO fest `urn:oasis:names:tc:SAML:2.0:cm:bearer` („das Halten selbst ist Nachweis") |
| `SubjectConfirmationData/@Recipient` | Muss ACS URL gleichen, die dieses Assertion empfängt, SP muss überprüfen |
| `SubjectConfirmationData/@NotOnOrAfter` | Bearer Bestätigungsablauf, muss überprüft werden; beachte: bearer Szenario **enthält nicht** `NotBefore` |
| `SubjectConfirmationData/@InResponseTo` | Gleiche Semantik wie Response äußere, SP-initiated muss Abgleich passen |

### Conditions

| Element/Attribut | Beschreibung |
|------------------|---------|
| `NotBefore` / `NotOnOrAfter` | Assertion gesamtfenster Gültigkeit (first inclusive, last exclusive), bei Validierung 2-3 Minuten Clock-Toleranz ermöglichen |
| `<AudienceRestriction>/<Audience>` | Zielgruppe, muss SPs **Entity ID** enthalten (nicht ACS URL) |
| `<OneTimeUse>` | Wenn vorhanden, muss SP einmalige Nutzung sicherstellen |

### AuthnStatement

| Attribut/Element | Beschreibung |
|------------------|---------|
| `AuthnInstant` | Tatsächliche Authentifizierungszeit (kann weit vorher sein, besonders bei IdP-Sitzung-Wiederverwendung) |
| `SessionIndex` | IdP-seitige Sitzungskennung, SP sollte speichern, SLO zurückfüllen |
| `SessionNotOnOrAfter` | IdP empfohlene SP-Sitzungs-Obergrenze, SP sollte beachten |
| `<AuthnContextClassRef>` | Authentifizierungsmethode, häufig: `...ac:classes:PasswordProtectedTransport` (HTTPS-Passwort), `...ac:classes:Password`, `...ac:classes:TimeSyncToken`, `urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified`. SP sollte diese Wert überprüfen wenn MFA erzwungen wird |

### AttributeStatement

| Attribut/Element | Beschreibung |
|------------------|---------|
| `<Attribute Name>` | Attributname. Kann Kurzname sein (`mail`) oder URI/OID-Stil (`urn:oid:0.9.2342.19200300.100.1.3`, `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`), bei Anbindung nach tatsächliche Werte gehen |
| `NameFormat` | `...attrname-format:basic` / `:uri` / `:unspecified` |
| `FriendlyName` | Lesbare Alias, nicht für Abgleich beteiligt |
| `<AttributeValue>` | Kann mehrwertig sein (z.B. mehrere Gruppen); beachte `xsi:type` könnte vorhanden sein |

## Häufige StatusCode

Top-Level Codes (`Value` Präfix sind alle `urn:oasis:names:tc:SAML:2.0:status:`):

| Wert | Bedeutung |
|------|---------|
| `Success` | Erfolgreich |
| `Requester` | Anfrageer (SP) Fehler — Anfrage ungültig, Parameter nicht akzeptiert |
| `Responder` | Antworter (IdP) Fehler — IdP interne Gründe, kann nicht verarbeiten |
| `VersionMismatch` | Protokollversion Nicht-Übereinstimmung |

Häufige zweite Level Codes (genestelt unter Top-Level):

| Wert (gleicher Präfix) | Bedeutung |
|--------|---------|
| `AuthnFailed` | Authentifizierung fehlgeschlagen (falsches Passwort, Benutzer abgebrochen usw.) |
| `InvalidNameIDPolicy` | IdP kann angeforderte NameID Format nicht erfüllen |
| `NoAuthnContext` | Kann RequestedAuthnContext Stärkeanforderung nicht erfüllen |
| `NoPassive` | `IsPassive=true` aber Benutzer keine Sitzung, braucht Interaktion |
| `RequestDenied` | Remote versteht Anfrage aber lehnt Durchführung ab (häufig Vertrauens-Konfiguration Nicht-Übereinstimmung) |
| `UnknownPrincipal` | Kann Hauptakteur nicht erkennen |
| `UnsupportedBinding` | Nicht-unterstütztes Binding angefordert |
| `PartialLogout` | SLO konnte nicht alle Beteiligten benachrichtigen |
| `ProxyCountExceeded` | Proxy Hop-Limit überschritten |

## NameID Format Übersicht

| Format URI | Beschreibung |
|------------|---------|
| `urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified` | Unspezifiziert, Semantik von Parteien offline vereinbart (Kompatibilität Fallback, sorgfältig nutzen) |
| `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress` | E-Mail-Format |
| `urn:oasis:names:tc:SAML:1.1:nameid-format:X509SubjectName` | X.509 Zertifikat-Subject-Name |
| `urn:oasis:names:tc:SAML:1.1:nameid-format:WindowsDomainQualifiedName` | `DOMAIN\user` Form |
| `urn:oasis:names:tc:SAML:2.0:nameid-format:kerberos` | Kerberos principal |
| `urn:oasis:names:tc:SAML:2.0:nameid-format:entity` | Kennzeichnet SAML-Entität selbst (Issuer Element Standard) |
| `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent` | Persistente Pseudonym: undurchsichtig, stabil für einzelnen SP, unterschiedlich über SP, empfohlen als Konto-Link Primärschlüssel |
| `urn:oasis:names:tc:SAML:2.0:nameid-format:transient` | Transiente Kennung, nur diese Sitzung gültig |

## Binding Parameter

### HTTP-Redirect Binding (URL Abfrage Parameter)

| Parameter | Beschreibung |
|-----------|---------|
| `SAMLRequest` / `SAMLResponse` | Nachricht Rumpf: XML → raw deflate → Base64 → URL Kodierung (Kodierungsdetails siehe [Typische Flows](./flows.md#redirect-url-的编码方式)) |
| `RelayState` | Undurchsichtiger Zustand, ≤80 Bytes, Remote muss unverändert zurückgeben |
| `SigAlg` | Signatur-Algorithmus URI, wie `http://www.w3.org/2001/04/xmldsig-more#rsa-sha256` |
| `Signature` | Signatur über `SAMLRequest(oder SAMLResponse)=..&RelayState=..&SigAlg=..` String (URL kodierte Form, feste Reihenfolge, nur tatsächlich vorhandene Parameter), Base64 dann URL kodiert |

### HTTP-POST Binding (Formular Felder)

| Feld | Beschreibung |
|------|---------|
| `SAMLRequest` / `SAMLResponse` | XML → Base64 (**kein deflate**), über Browser Auto-Submit Formular POST |
| `RelayState` | Wie oben |

Im POST Binding ist Signatur XML-eingebettete `<ds:Signature>`, nicht separate Felder.

## Metadata Schlüsselelemente

### Universal

| Element/Attribut | Beschreibung |
|------------------|---------|
| `<EntityDescriptor entityID>` | Wurzelelement; `entityID` ist Entitätskennung |
| `validUntil` / `cacheDuration` | Metadaten Gültigkeitsdauer/Cache-Dauer, Consumer sollte periodisch aktualisieren |
| `<KeyDescriptor use="signing">` | Signatur Verifikationszertifikat (enthält `<ds:X509Certificate>`); `use` auslassen bedeutet Signatur/Verschlüsselung beide |
| `<KeyDescriptor use="encryption">` | Verschlüsselungs-Public-Key Zertifikat |

### IdP Seite (`<IDPSSODescriptor>`)

| Element/Attribut | Beschreibung |
|------------------|---------|
| `protocolSupportEnumeration` | Fest enthält `urn:oasis:names:tc:SAML:2.0:protocol` |
| `<SingleSignOnService Binding Location>` | SSO Endpunkt, nach Binding je eine |
| `<SingleLogoutService Binding Location>` | SLO Endpunkt |
| `WantAuthnRequestsSigned` | Ob SP AuthnRequest signieren soll |

### SP Seite (`<SPSSODescriptor>`)

| Element/Attribut | Beschreibung |
|------------------|---------|
| `<AssertionConsumerService Binding Location index isDefault>` | ACS Endpunkt, kann mehrere, `index` zur `AssertionConsumerServiceIndex` Referenzierung |
| `<SingleLogoutService>` | SP SLO Endpunkt |
| `AuthnRequestsSigned` | SP verpflichtet sich AuthnRequest zu signieren |
| `WantAssertionsSigned` | SP fordert Assertion muss signiert sein |
| `<NameIDFormat>` | SP Unterstützung/erwartete NameID Format Liste |

## Troubleshooting Schnellreferenz

| Phänomen | Häufige Ursachen |
|----------|---------|
| IdP meldet SAMLRequest nicht parsbar | Redirect Binding Kodierungs-Reihenfolge falsch (deflate vergessen / zlib-Header mitgenommen / URL-safe Base64 / doppelt URL-kodiert) |
| Signature validation failed | Remote-Zertifikat rotiert, lokale Metadata nicht synchron aktualisiert; Signatur/Digest-Algorithmus nicht akzeptiert (z.B. SHA-1 verboten); Redirect Signatur String Verkettungs-Reihenfolge oder URL-Kodierungs-Form falsch; XML von Middleware verändert (formatiert, Kodierung) |
| Invalid Destination / Recipient | ACS oder SSO Endpunkt URL Nicht-Übereinstimmung: http vs https, Port, Trailing-Slash, Reverse-Proxy ändert Host |
| Audience Validierung fehlgeschlagen | SP Entity ID fehlkonfiguriert (häufig: ACS URL als Entity ID gefüllt) |
| Response abgelaufen / noch nicht gültig | Doppel-Uhr Offset; SP keine clock skew Toleranz konfiguriert; Benutzer verbrachte lange Zeit auf IdP-Anmeldeseite vor Einreichung |
| InResponseTo Nicht-Übereinstimmung | SP Cluster teilt Request ID Speicher nicht (Knoten A sendet Anfrage, Knoten B empfängt Response); Benutzer Zurück/Refresh markiert ID verbraucht; IdP-initiated Response an SP-initiated-only SP |
| Anmeldung erfolgreich, aber Attribute nicht abrufbar | IdP hat Attribute Release Richtlinie nicht konfiguriert; Attributnamen Nicht-Übereinstimmung (Kurzname vs URI/OID); Assertion verschlüsselt aber SP dekodiert nicht bevor Wert liest |
| Umleitungs-Schleife (SP↔IdP wiederholtes Springen) | SP Session Cookie nicht gesetzt (SameSite/Secure/Domäne Konfiguration falsch), SP denkt immer noch nicht angemeldet |
| IdP meldet unbekannt/ungültig SP | AuthnRequest Issuer stimmt nicht mit IdP-seitig registrierter Entity ID |
| SLO danach andere SP noch online | SLO-Kette einen Hop fehlgeschlagen (prüfe ob `PartialLogout` zurückkommt); SP speichert SessionIndex nicht; Third-Party Cookie von Browser blockiert |
| Nur IE/bestimmter Proxy fehlgeschlagen | URL zu lang (Redirect Binding Nachricht zu groß), nutze POST Binding für AuthnRequest |

::: tip Debugging Tools
Browser Plugin SAML-tracer (Firefox/Chrome) kann abgefangene SAMLRequest/SAMLResponse direkt dekodieren; beim Backend-Debugging erst Base64 dekodieren und XML ansehen, dann diese Seiten-Tabelle Punkt für Punkt durchgehen. Überwiegend Probleme liegen bei URL/Entity ID/Zertifikat-Konfigurationen-Nicht-Übereinstimmung.
:::
