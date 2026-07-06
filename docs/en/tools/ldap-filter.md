---
title: LDAP Filter Builder
---

# LDAP Search Filter Builder

Visually assemble LDAP search filters compliant with [RFC 4515](https://datatracker.ietf.org/doc/html/rfc4515): select attributes, operators, and values; support AND / OR combinations and NOT negation; special characters `* ( ) \` in values are automatically escaped. The generated filter can be copied with one click or tested directly against this site's [Mock LDAP](../mock/ldap.md) example directory.

<ClientOnly>
  <LdapFilterBuilder />
</ClientOnly>

::: tip Filter Quick Reference
- Equality: `(uid=alice)`; present: `(mail=*)`; substring: `(cn=*Zh*)`
- AND / OR / NOT: `(&(A)(B))`, `(|(A)(B))`, `(!(A))`
- Common combination: `(&(objectClass=person)(memberOf=cn=admins,ou=groups,dc=example,dc=com))`
:::

See complete syntax and common attributes in [LDAP Reference](../ldap/reference.md).

<script setup>
import LdapFilterBuilder from '@components/LdapFilterBuilder.vue'
</script>
