---
title: LDAP-Übersicht
---

# LDAP-Übersicht

**LDAP**(Lightweight Directory Access Protocol, Leichtgewichtiges Verzeichniszugriffsprotokoll) ist ein Protokoll für den Zugriff und die Verwaltung von **Verzeichnisdiensten**, definiert in der [RFC 4510–4519](https://datatracker.ietf.org/doc/html/rfc4510)-Serie. Es wird häufig als **Identitätsdatenquelle** im Unternehmen eingesetzt: Benutzer, Gruppen, Organisationsstrukturen, Geräte usw. werden als hierarchische „Einträge" im Verzeichnis gespeichert, und Anwendungen nutzen LDAP zur Benutzerabfrage, zur Kennwortvalidierung (bind) und zur Überprüfung der Gruppenmitgliedschaft.

## Verzeichnis ist keine Datenbank

Ein LDAP-Verzeichnis ist ein Baum (DIT, Directory Information Tree), der für **lesehäufige, schreibseltene und hierarchische** Szenarien optimiert ist:

- Daten sind hierarchisch organisiert (wie `dc=com → dc=example → ou=people → uid=alice`), nicht in relationalen Tabellen.
- Lese- und Suchvorgänge sind sehr schnell, Schreibvorgänge und Transaktionsfähigkeit sind schwach (kein Ersatz für relationale Datenbanken).
- Betonung auf **standardisiertem Schema**(objectClass und Attributtypen) sowie Interoperabilität zwischen Anbietern.

Typische Implementierungen: OpenLDAP, Microsoft Active Directory (AD), 389 Directory Server, Apache DS und Cloud-Verzeichnisdienste.

## Position im Authentifizierungssystem

- **Authentifizierung (bind)**: Die Anwendung sendet den von Benutzer eingegebenen DN + Kennwort an das Verzeichnis für einen `bind`. Ein erfolgreicher bind beweist die Richtigkeit des Kennworts – dies ist die traditionellste Form des „LDAP-Logins".
- **Attribute/Autorisierungsquelle**: Auch wenn SAML / OIDC für das Frontend-Login verwendet wird, dient LDAP/AD im Hintergrund des IdP häufig als **verbindliche Datenquelle** für Benutzer und Gruppen, Attribute werden nach dem Login aus dem Verzeichnis abgerufen und die Gruppenmitgliedschaft wird für die Autorisierung überprüft.
- Beziehung zu [SAML](../saml/) / [OIDC](../oidc/): Letztere sind „Verbund-Login"-Protokolle; LDAP ist ein „Verzeichniszugriff"-Protokoll. Eine häufige Unternehmenskombination ist: Keycloak/ADFS und andere IdP **verbunden mit AD/LDAP**, die dann extern SAML/OIDC bereitstellen.

## Von wo aus anfangen

- Möchten Sie DN, Einträge, objectClass, Suchbereich verstehen? Siehe [Kernkonzepte](./concepts.md).
- Möchten Sie sehen, wie ein bind + search genau funktioniert? Siehe [Typische Workflows](./flows.md).
- Benötigen Sie Nachschlagwerk für Filtersyntax, häufige Attribute und Ergebniscodes? Siehe [Referenz](./reference.md).
- Möchten Sie direkt einen Suchfilter zusammenstellen? Verwenden Sie den [LDAP-Filtergenerator](../tools/ldap-filter.md) und testen Sie gegen das [Mock LDAP](../mock/ldap.md)-Beispielverzeichnis.
