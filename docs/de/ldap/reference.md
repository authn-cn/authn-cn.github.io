---
title: Parameter und Syntax-Referenz
---

# LDAP Parameter und Syntax-Referenz

## Suchfilter (RFC 4515)

| Form | Bedeutung | Beispiel |
|------|-----------|----------|
| `(attr=value)` | Gleichheit | `(uid=alice)` |
| `(attr=*)` | Attribut vorhanden (present) | `(mail=*)` |
| `(attr=a*b*c)` | Teilstring (`*` Wildcard) | `(cn=Al*)`、`(mail=*@example.com)` |
| `(attr>=value)` | Größer oder gleich | `(uidNumber>=1000)` |
| `(attr<=value)` | Kleiner oder gleich | `(uidNumber<=2000)` |
| `(attr~=value)` | Approximate Matching | `(cn~=alise)` |
| `(&(f1)(f2)…)` | Logisches UND (AND) | `(&(objectClass=person)(uid=alice))` |
| `(\|(f1)(f2)…)` | Logisches ODER (OR) | `(\|(uid=alice)(uid=bob))` |
| `(!(f))` | Logisches NICHT (NOT) | `(!(objectClass=computer))` |
| `(attr:rule:=value)` | Extended Matching | AD Bitweise UND: `(userAccountControl:1.2.840.113556.1.4.803:=2)` |

**Wert-Escaping**: Sonderzeichen müssen in `\` + zwei hexadezimale Ziffern umgewandelt werden – `*`→`\2a`、`(`→`\28`、`)`→`\29`、`\`→`\5c`、NUL→`\00`. Der [Filtergenerator](../tools/ldap-filter.md) erledigt das automatische Escaping.

## Häufige Attribute

| Attribut | Bedeutung |
|----------|-----------|
| `dc` | domainComponent (z.B. `dc=example,dc=com`) |
| `ou` | organizationalUnit (Organisationseinheit/Container) |
| `cn` | commonName (Allgemeiner Name) |
| `sn` / `givenName` | Nachname / Vorname |
| `uid` | Benutzer-ID |
| `mail` | E-Mail-Adresse |
| `member` / `memberOf` | Gruppenmitglied DN / Gruppen des Benutzers |
| `objectClass` | Eintragstyp (mehrwertig) |
| `userPassword` | Kennwort (normalerweise nicht lesbar) |
| `sAMAccountName` / `userPrincipalName` | AD Login-Name / UPN |

## Häufige objectClass

| objectClass | Zweck |
|-------------|--------|
| `top` | Abstrakte Basisklasse aller Einträge |
| `domain` / `dcObject` | Domain-Komponenten-Einträge |
| `organizationalUnit` | Container / OU |
| `person` → `organizationalPerson` → `inetOrgPerson` | Personal (aufeinanderfolgende Attribut-Erweiterungen) |
| `groupOfNames` / `groupOfUniqueNames` | Gruppen (Mitglieder mit `member` auflisten) |
| `posixAccount` / `posixGroup` | Unix-Konto/Gruppen (uidNumber usw.) |

## LDAP URL (RFC 4516)

```
ldap://host:port/base?attributes?scope?filter
ldaps://ldap.example.com/ou=people,dc=example,dc=com?cn,mail?sub?(uid=alice)
```

`scope` ist `base` / `one` / `sub`.

## Häufige Ergebniscodes

| Code | Name | Bedeutung |
|------|------|-----------|
| 0 | success | Erfolg |
| 32 | noSuchObject | Base DN existiert nicht |
| 49 | invalidCredentials | bind fehlgeschlagen (DN/Kennwort falsch) |
| 34 | invalidDNSyntax | DN-Syntaxfehler |
| 50 | insufficientAccessRights | Unzureichende Berechtigung |
| 4 | sizeLimitExceeded | Rückgabegrenze überschritten |
| 19 | constraintViolation | Einschränkungsverletzung (z.B. Kennwortrichtlinie) |

## ldapsearch Schnellreferenz

```bash
# Suche (LDAPS + Servicekonto)
ldapsearch -H ldaps://ldap.example.com -x \
  -D "cn=reader,ou=apps,dc=example,dc=com" -w '****' \
  -b "dc=example,dc=com" -s sub "(&(objectClass=person)(departmentNumber=eng))" cn mail

# Kennwort eines bestimmten Benutzers überprüfen (simple bind, erfolgreich = Kennwort korrekt)
ldapwhoami -H ldaps://ldap.example.com -x \
  -D "uid=alice,ou=people,dc=example,dc=com" -w '****'
```

Möchten Sie direkt ausprobieren? [Filtergenerator](../tools/ldap-filter.md) + [Mock LDAP](../mock/ldap.md) (Beispielverzeichnis `dc=example,dc=com`).
