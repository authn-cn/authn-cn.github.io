---
title: Typical Flows
---

# LDAP Typical Flows

## Search: bind → search → result

```mermaid
sequenceDiagram
    participant C as Client
    participant S as LDAP Server
    C->>S: 1. bind(DN, password / anonymous)
    Note right of S: validate credentials
    S-->>C: bindResponse: success
    C->>S: 2. searchRequest (base, scope, filter, attrs)
    Note right of S: traverse entries in scope, match by filter
    S-->>C: searchResultEntry * N (return one entry per match)
    S-->>C: searchResultDone: success
    C->>S: 3. unbind
```

Demonstrate the same process with `ldapsearch`:

```bash
ldapsearch -H ldaps://ldap.example.com \
  -D "cn=svc-reader,ou=apps,dc=example,dc=com" -w '****' \
  -b "ou=people,dc=example,dc=com" -s sub \
  "(&(objectClass=person)(mail=alice@example.com))" cn mail
```

## User Authentication: Two Approaches

### 1) Direct bind (simple bind)

The application directly uses **the user's DN + the password entered by the user** to bind; success means authentication succeeds:

1. If the user DN pattern is known (e.g., `uid=<input>,ou=people,dc=example,dc=com`), construct the DN directly;
2. `bind(userDN, password)`;
3. Success = password is correct; failure (`invalidCredentials`) = deny login.

Simple, but requires the application to be able to derive the DN from the username.

### 2) search + bind (most common)

The username may not equal the RDN (login might be via mail or sAMAccountName), so:

1. The application first binds with a **service account** (read-only permissions);
2. **search** the user entry by login name to get its true DN, for example `(|(uid=<input>)(mail=<input>))`;
3. Bind again with **the found DN + user password** to verify the password;
4. (Optional) search / read `memberOf` again to check group membership for authorization.

```mermaid
sequenceDiagram
    participant A as Application
    participant L as LDAP
    A->>L: bind(service account)
    A->>L: search(&(objectClass=person)(mail=user input))
    L-->>A: get userDN
    A->>L: bind(userDN, user password)
    L-->>A: success / failure
    A->>L: search(memberOf / group member)
    L-->>A: check authorization
```

## Connection with Federated Login

LDAP/AD commonly serves as the backend directory for an IdP in enterprises:

```mermaid
flowchart LR
    U["User"] -->|SAML/OIDC| I["IdP(Keycloak/ADFS)"] -->|LDAP bind+search| D["AD/LDAP"]
    I --> M["retrieve attributes/groups from directory → map into SAML assertion / OIDC claims"]
```

That is, the front end speaks [SAML](../saml/flows.md) / [OIDC](../oidc/flows.md), but behind the scenes LDAP bind/search still performs authentication and data retrieval.

Want to try search and filters? Use the [Filter Builder](../tools/ldap-filter.md) on the [Mock LDAP](../mock/ldap.md) example directory.
