---
title: LDAP-Filtergenerator
---

# LDAP-Suchfiltergenerator

Visuelles Zusammenstellen von Suchfiltern nach [RFC 4515](https://datatracker.ietf.org/doc/html/rfc4515): Attribute, Operatoren und Werte auswählen, AND / OR-Kombinationen und NOT-Negationen unterstützen, spezielle Zeichen in Werten (`* ( ) \`) werden automatisch escaped. Der generierte Filter kann mit einem Klick kopiert oder direkt gegen das [Mock LDAP](../mock/ldap.md)-Beispielverzeichnis dieser Website getestet werden.

<ClientOnly>
  <LdapFilterBuilder />
</ClientOnly>

::: tip Filter-Schnellreferenz
- Gleichheit: `(uid=alice)`; Vorhanden: `(mail=*)`; Teilstring: `(cn=*Zh*)`
- UND / ODER / NICHT: `(&(A)(B))`、`(|(A)(B))`、`(!(A))`
- Häufige Kombination: `(&(objectClass=person)(memberOf=cn=admins,ou=groups,dc=example,dc=com))`
:::

Vollständige Syntax und häufige Attribute unter [LDAP-Referenz](../ldap/reference.md).

<script setup>
import LdapFilterBuilder from '@components/LdapFilterBuilder.vue'
</script>
