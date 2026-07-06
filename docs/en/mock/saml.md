---
title: SAML Mock
---

# SAML Mock

The SAML side includes two roles: **IdP** (issuer) and **SP** (consumer), which pair together for end-to-end Web Browser SSO demonstration. For terminology and overall explanation, see [Mock Overview](./README.md).

**Service URL: <https://mock.authn.tech/>**

## IdP — Identity Provider

| Endpoint | Path |
|----------|------|
| Metadata | [`/saml/idp/metadata`](https://mock.authn.tech/saml/idp/metadata) |
| SSO (Redirect / POST) | `/saml/idp/sso` |

- Import the Metadata URL to your SP to integrate. **SP-initiated**: send `AuthnRequest` to the SSO endpoint (supports Redirect and POST Binding).
- **IdP-initiated**: `/saml/idp/sso?user=alice&sp=<SP-entityID>&acs=<SP-ACS-URL>`.
- Issues signed assertions containing `AttributeStatement` (email / name, etc.), independently verified signature via industry-standard library `xml-crypto`; self-signed certificate included in Metadata.

## SP — Service Provider

| Endpoint | Path |
|----------|------|
| Console | [`/saml/sp/`](https://mock.authn.tech/saml/sp/) |
| Metadata | [`/saml/sp/metadata`](https://mock.authn.tech/saml/sp/metadata) |
| ACS (POST) | `/saml/sp/acs` |

Open the console and click to initiate SP-initiated login, **displaying signature verification results and assertion parsing**.

Want to see it work live? See the **real, clickable** [SAML login demo](./saml-demo.md), running through signature → verification → parsing in one click and displaying results at each step.

## Call Sequence (SP-initiated Web Browser SSO)

With "your SP + Mock IdP":

1. **SP** generates `AuthnRequest`, redirects the browser (or POSTs) to **IdP**'s `/saml/idp/sso`.
2. **IdP** displays test user selection page (or directly selects per `&user=alice`).
3. **IdP** generates and **signs** SAML `Response` (containing `Assertion`), POSTs back to **SP**'s ACS (`AssertionConsumerService`) address via browser.
4. **SP** uses the certificate from IdP Metadata to **verify the signature**, validates `Audience`, `NotBefore` / `NotOnOrAfter`, `InResponseTo` conditions, etc.
5. **SP** reads `NameID` and attributes from the `Assertion`, establishes a local session.

> `AuthnRequest` / `Response` raw content can be viewed using [SAML Encode/Decode](../tools/saml.md) and [SAML Response Parser](../tools/saml-parse.md); Metadata using [SAML Metadata Parser](../tools/saml-metadata.md).
