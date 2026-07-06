---
title: LDAP Directory
---

# Mock LDAP Directory (Search Simulator)

**Service URL: <https://mock.authn.tech/ldap/>**

::: warning Not a Real LDAP Protocol Server
LDAP is a binary ASN.1/BER protocol over TCP (389/636), and Cloudflare Workers **cannot listen on TCP** (nor can 443 HTTP routing rewrite LDAP). A real LDAP server capable of bind/search must run on a host that can listen to TCP (OpenLDAP in a VM/container, optionally using Cloudflare Spectrum for passthrough). This provides an **HTTP/JSON search simulator** instead: exposes a fixed example directory and evaluates RFC 4515 filters, for testing **search scope and filter semantics** during integration testing.
:::

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /ldap/` | Info page |
| `GET /ldap/entries` | Return entire example directory (JSON) |
| `GET /ldap/search?base=&scope=&filter=&attributes=` | Search by base (DN), scope (`base`\|`one`\|`sub`), RFC 4515 filter |

Parameters: `base` (default `dc=example,dc=com`), `scope` (default `sub`), `filter` (default `(objectClass=*)`), `attributes` (comma-separated, optional, for attribute projection). CORS fully open.

## Example Directory

Under `dc=example,dc=com`: `ou=people` (users alice / bob / carol) and `ou=groups` (groups admins / developers). Users have attributes such as `uid`, `cn`, `sn`, `mail`, `title`, `departmentNumber`, `employeeType`, and more. See complete contents at [`/ldap/entries`](https://mock.authn.tech/ldap/entries).

## Try It

```bash
# All people in engineering
curl "https://mock.authn.tech/ldap/search?base=dc=example,dc=com&scope=sub&filter=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote("(&(objectClass=person)(departmentNumber=eng))"))')"

# Only mail and uid attributes
curl "https://mock.authn.tech/ldap/search?base=ou=people,dc=example,dc=com&filter=(uid=carol)&attributes=mail,uid"
```

Don't want to write filters manually? Use the [LDAP Filter Builder](../tools/ldap-filter.md) to visually compose and test against this directory with one click. See the protocol itself in [LDAP Overview](../ldap/README.md).
