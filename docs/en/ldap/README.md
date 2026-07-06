---
title: LDAP Overview
---

# LDAP Overview

**LDAP** (Lightweight Directory Access Protocol) is a protocol for accessing and maintaining **directory services**, defined in [RFC 4510–4519](https://datatracker.ietf.org/doc/html/rfc4510). It is commonly used as an enterprise's **identity data source**: users, groups, organizational structures, devices and more are stored as hierarchical "entries" in the directory, and applications use LDAP to query users, verify passwords (bind), and check group membership.

## Directory is Not a Database

An LDAP directory is a tree (DIT, Directory Information Tree), optimized for **read-heavy, write-light, hierarchical** scenarios:

- Data is organized hierarchically (e.g., `dc=com → dc=example → ou=people → uid=alice`), not in relational tables.
- Reading and searching are very fast; writing and transactional capabilities are weak (not a substitute for a relational database).
- Emphasizes **standardized schema** (objectClass and attribute types) and cross-vendor interoperability.

Typical implementations: OpenLDAP, Microsoft Active Directory (AD), 389 Directory Server, Apache DS, and cloud directory services.

## Position in the Authentication Architecture

- **Authentication (bind)**: An application sends a user's DN + password to the directory to `bind`; success proves the password is correct — this is the most traditional "LDAP login."
- **Attribute/Authorization source**: Even when using SAML / OIDC for front-end login, the IdP backend often still uses LDAP/AD as the **authoritative data source** for users and groups, retrieving attributes from the directory after login and checking group membership for authorization.
- Relationship with [SAML](../saml/) / [OIDC](../oidc/): the latter are "federated login" protocols; LDAP is a "directory access" protocol. A common enterprise combination is: Keycloak/ADFS and other IdPs **federating to AD/LDAP**, with SAML/OIDC exposed externally.

## Where to Start

- Want to understand DN, entries, objectClass, search scope? See [Core Concepts](./concepts.md).
- Want to see how a bind + search actually works? See [Typical Flows](./flows.md).
- Need quick reference for filter syntax, common attributes, result codes? See [Reference](./reference.md).
- Want to build a search filter directly? Use the [LDAP Filter Builder](../tools/ldap-filter.md) and test against the [Mock LDAP](../mock/ldap.md) example directory.
