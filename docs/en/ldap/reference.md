---
title: Parameters and Syntax Reference
---

# LDAP Parameters and Syntax Reference

## Search Filters (RFC 4515)

| Form | Meaning | Example |
|------|---------|---------|
| `(attr=value)` | Equality | `(uid=alice)` |
| `(attr=*)` | Attribute present | `(mail=*)` |
| `(attr=a*b*c)` | Substring (wildcard `*`) | `(cn=Al*)`, `(mail=*@example.com)` |
| `(attr>=value)` | Greater than or equal | `(uidNumber>=1000)` |
| `(attr<=value)` | Less than or equal | `(uidNumber<=2000)` |
| `(attr~=value)` | Approximate match | `(cn~=alise)` |
| `(&(f1)(f2)…)` | Logical AND | `(&(objectClass=person)(uid=alice))` |
| `(\|(f1)(f2)…)` | Logical OR | `(\|(uid=alice)(uid=bob))` |
| `(!(f))` | Logical NOT | `(!(objectClass=computer))` |
| `(attr:rule:=value)` | Extended match | AD bitwise AND: `(userAccountControl:1.2.840.113556.1.4.803:=2)` |

**Value escaping**: special characters must be converted to `\` + two hex digits — `*` → `\2a`, `(` → `\28`, `)` → `\29`, `\` → `\5c`, NUL → `\00`. The [Filter Builder](../tools/ldap-filter.md) will escape automatically.

## Common Attributes

| Attribute | Meaning |
|-----------|---------|
| `dc` | domainComponent (e.g., `dc=example,dc=com`) |
| `ou` | organizationalUnit (organizational unit / container) |
| `cn` | commonName |
| `sn` / `givenName` | surname / given name |
| `uid` | user ID |
| `mail` | email |
| `member` / `memberOf` | group member DN / groups the user belongs to |
| `objectClass` | entry type (multivalued) |
| `userPassword` | password (usually not readable) |
| `sAMAccountName` / `userPrincipalName` | AD login name / UPN |

## Common objectClasses

| objectClass | Purpose |
|-------------|---------|
| `top` | abstract base class for all entries |
| `domain` / `dcObject` | domain component entry |
| `organizationalUnit` | container / OU |
| `person` → `organizationalPerson` → `inetOrgPerson` | person (progressively extending attributes) |
| `groupOfNames` / `groupOfUniqueNames` | group (list members in `member`) |
| `posixAccount` / `posixGroup` | Unix account / group (uidNumber, etc.) |

## LDAP URL (RFC 4516)

```
ldap://host:port/base?attributes?scope?filter
ldaps://ldap.example.com/ou=people,dc=example,dc=com?cn,mail?sub?(uid=alice)
```

`scope` takes `base` / `one` / `sub`.

## Common Result Codes

| Code | Name | Meaning |
|------|------|---------|
| 0 | success | Success |
| 32 | noSuchObject | base DN does not exist |
| 49 | invalidCredentials | bind failed (wrong DN/password) |
| 34 | invalidDNSyntax | DN syntax error |
| 50 | insufficientAccessRights | insufficient permissions |
| 4 | sizeLimitExceeded | exceeded result size limit |
| 19 | constraintViolation | constraint violation (e.g., password policy) |

## ldapsearch Quick Reference

```bash
# Search (LDAPS + service account)
ldapsearch -H ldaps://ldap.example.com -x \
  -D "cn=reader,ou=apps,dc=example,dc=com" -w '****' \
  -b "dc=example,dc=com" -s sub "(&(objectClass=person)(departmentNumber=eng))" cn mail

# Verify a user's password (simple bind; successful connection means password is correct)
ldapwhoami -H ldaps://ldap.example.com -x \
  -D "uid=alice,ou=people,dc=example,dc=com" -w '****'
```

Want to try directly: [Filter Builder](../tools/ldap-filter.md) + [Mock LDAP](../mock/ldap.md) (example directory `dc=example,dc=com`).
