---
title: LDAP-Verzeichnis
---

# Mock LDAP-Verzeichnis (Suchsimulator)

**Service-Adresse: <https://mock.authn.tech/ldap/>**

::: warning Kein echtes LDAP-Protokoll-Server
LDAP ist ein binäres Protokoll (ASN.1/BER) über TCP (389/636), aber Cloudflare Workers **können TCP nicht abhören** (auch können HTTP-Routen auf Port 443 nicht in LDAP umgeschrieben werden). Ein echter LDAP-Server, der bind/search durchführen kann, muss auf einem Host mit TCP-Abhörkompetenz laufen (OpenLDAP in VM/Container usw., optional mit Cloudflare Spectrum für Passthrough). Daher wird hier ein **HTTP/JSON-Suchsimulator** bereitgestellt: ein festes Beispielverzeichnis wird offengelegt, und RFC 4515-Filter werden ausgewertet, um **Suchbereich und Filtersemantik** abzustimmen.
:::

## Endpunkte

| Endpunkt | Beschreibung |
|----------|-------------|
| `GET /ldap/` | Infoseite |
| `GET /ldap/entries` | Gibt das gesamte Beispielverzeichnis zurück (JSON) |
| `GET /ldap/search?base=&scope=&filter=&attributes=` | Nach base (DN), scope (`base`\|`one`\|`sub`), RFC 4515 filter suchen |

Parameter: `base` (Standard `dc=example,dc=com`), `scope` (Standard `sub`), `filter` (Standard `(objectClass=*)`), `attributes` (kommagetrennt, optional, für Attribut-Projektion). CORS vollständig aktiviert.

## Beispielverzeichnis

Unter `dc=example,dc=com`: `ou=people` (Benutzer alice / bob / carol) und `ou=groups` (Gruppen admins / developers). Benutzer haben Attribute wie `uid`, `cn`, `sn`, `mail`, `title`, `departmentNumber`, `employeeType` usw. Vollständige Inhalte unter [`/ldap/entries`](https://mock.authn.tech/ldap/entries).

## Probieren Sie es aus

```bash
# Alle Personen in der Ingenieurabdeilung
curl "https://mock.authn.tech/ldap/search?base=dc=example,dc=com&scope=sub&filter=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote("(&(objectClass=person)(departmentNumber=eng))"))')"

# Nur mail und uid Attribute
curl "https://mock.authn.tech/ldap/search?base=ou=people,dc=example,dc=com&filter=(uid=carol)&attributes=mail,uid"
```

Wollen Sie nicht manuell Filter schreiben? Nutzen Sie den [LDAP-Filtergenerator](../tools/ldap-filter.md) zum visuellen Zusammenstellen und Eins-Klick-Test gegen dieses Verzeichnis. Das Protokoll selbst unter [LDAP-Übersicht](../ldap/README.md).
