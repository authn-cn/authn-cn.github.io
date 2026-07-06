---
title: "Typical Parameters and Message Reference"
---

# Typical Parameters and Message Reference

This page is a quick reference organized by message type. Flow context is in [Typical Flows](./flows.md), concept explanations are in [Core Concepts](./concepts.md).

## AuthnRequest Key Elements and Attributes

| Element/Attribute | Required | Description |
|-------------------|----------|-------------|
| `ID` | Yes | Request unique identifier (NCName, cannot start with digit, convention adds `_` prefix). SP must retain this to compare with Response's `InResponseTo` |
| `Version` | Yes | Fixed as `2.0` |
| `IssueInstant` | Yes | Issue time, UTC ISO 8601 (e.g., `2026-07-03T08:29:55Z`). IdP will reject requests with excessive time deviation |
| `Destination` | Recommended | IdP SSO endpoint URL. When message is signed, IdP must validate it matches the actual reception address |
| `AssertionConsumerServiceURL` | Recommended | Expected SP ACS address to receive Response. IdP must verify it's within the registered SP Metadata range, otherwise can be exploited to steal Assertion |
| `ProtocolBinding` | Optional | Expected Response Binding, typically `urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST` |
| `AssertionConsumerServiceIndex` | Optional | Use index instead of explicit URL (mutually exclusive) |
| `ForceAuthn` | Optional | When `true`, require IdP to ignore existing sessions and force re-authentication (commonly used for step-up before sensitive operations) |
| `IsPassive` | Optional | When `true`, prohibit IdP from interacting with user; return `NoPassive` error if no session exists (used for silent login status probing) |
| `<Issuer>` | Yes | SP Entity ID |
| `<NameIDPolicy>` | Optional | `Format` declares expected NameID format; `AllowCreate="true"` allows IdP to create identifiers for new users |
| `<RequestedAuthnContext>` | Optional | Required authentication strength, containing one or more `<AuthnContextClassRef>`; `Comparison` takes `exact`/`minimum`/`maximum`/`better` |
| `<Scoping>` / `<ProxyCount>` | Optional | Proxy/intermediary IdP scenarios, rarely used |

## Response and Assertion Structure

### Response Outer Layer

| Element/Attribute | Description |
|-------------------|-------------|
| `ID` / `Version` / `IssueInstant` | Same as above; `ID` used for logging correlation and replay prevention |
| `InResponseTo` | Corresponds to AuthnRequest `ID`. **Does not exist in IdP-initiated flow** |
| `Destination` | SP ACS URL; SP must validate it matches itself |
| `<Issuer>` | IdP Entity ID |
| `<samlp:Status>` | Processing result; see StatusCode table below |
| `<saml:Assertion>` or `<saml:EncryptedAssertion>` | Assertion on success (0..n, typically exactly 1 in Web SSO); may be absent on failure |

### Status

| Element | Description |
|---------|-------------|
| `<StatusCode Value="...">` | Top-level status code (see table below), can be nested with secondary StatusCode for refinement |
| `<StatusMessage>` | Human-readable information; check this first for troubleshooting |
| `<StatusDetail>` | Machine-readable supplementary details |

### Subject and SubjectConfirmation (bearer)

| Element/Attribute | Description |
|-------------------|-------------|
| `<NameID>` | Subject identifier; `Format` see list below |
| `<SubjectConfirmation Method>` | Web SSO fixed to `urn:oasis:names:tc:SAML:2.0:cm:bearer` ("possession proves identity") |
| `SubjectConfirmationData/@Recipient` | Must equal the ACS URL receiving this Assertion; SP must validate |
| `SubjectConfirmationData/@NotOnOrAfter` | Expiration time of bearer confirmation; must validate; note bearer scenario **does not contain** `NotBefore` |
| `SubjectConfirmationData/@InResponseTo` | Same semantics as Response outer layer; SP-initiated must match |

### Conditions

| Element/Attribute | Description |
|-------------------|-------------|
| `NotBefore` / `NotOnOrAfter` | Assertion overall validity window (left-closed, right-open); allow 2–3 minutes clock skew tolerance when validating |
| `<AudienceRestriction>/<Audience>` | Audience; must contain this SP's **Entity ID** (not ACS URL) |
| `<OneTimeUse>` | When present, SP must ensure single use |

### AuthnStatement

| Attribute/Element | Description |
|-------------------|-------------|
| `AuthnInstant` | Actual authentication time (may be much earlier than Assertion issue time, especially when IdP session is reused) |
| `SessionIndex` | IdP-side session index; SP should save this; fill it back in SLO |
| `SessionNotOnOrAfter` | IdP's recommended SP session upper limit; SP should respect |
| `<AuthnContextClassRef>` | Authentication method; common: `...ac:classes:PasswordProtectedTransport` (HTTPS password), `...ac:classes:Password`, `...ac:classes:TimeSyncToken`, `urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified`. SP should validate this value when enforcing MFA |

### AttributeStatement

| Attribute/Element | Description |
|-------------------|-------------|
| `<Attribute Name>` | Attribute name. May be short form (`mail`) or URI/OID style (`urn:oid:0.9.2342.19200300.100.1.3`, `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`); match based on what the other party actually sends |
| `NameFormat` | `...attrname-format:basic` / `:uri` / `:unspecified` |
| `FriendlyName` | Human-readable alias, not used in matching logic |
| `<AttributeValue>` | Can be multi-valued (e.g., multiple groups); note `xsi:type` may be present |

## Common StatusCode

Top-level codes (`Value` prefix all `urn:oasis:names:tc:SAML:2.0:status:`):

| Value | Meaning |
|-------|---------|
| `Success` | Success |
| `Requester` | Requestor (SP) error—malformed request, unaccepted parameters |
| `Responder` | Responder (IdP) error—IdP internal reason for inability to process |
| `VersionMismatch` | Protocol version mismatch |

Common secondary codes (nested within top-level code):

| Value (same prefix) | Meaning |
|----|--------|
| `AuthnFailed` | Authentication failed (wrong password, user canceled, etc.) |
| `InvalidNameIDPolicy` | IdP cannot satisfy the requested NameID Format |
| `NoAuthnContext` | Cannot satisfy RequestedAuthnContext strength requirement |
| `NoPassive` | `IsPassive=true` but user has no session; interaction needed |
| `RequestDenied` | Peer understands request but refuses to execute (often due to trust configuration mismatch) |
| `UnknownPrincipal` | Cannot identify the subject |
| `UnsupportedBinding` | Does not support the Binding specified in request |
| `PartialLogout` | SLO could not notify all participants |
| `ProxyCountExceeded` | Proxy hops exceeded limit |

## NameID Format List

| Format URI | Description |
|------------|-------------|
| `urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified` | Unspecified; semantics agreed offline between parties (compatibility fallback, use cautiously) |
| `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress` | Email format |
| `urn:oasis:names:tc:SAML:1.1:nameid-format:X509SubjectName` | X.509 certificate subject name |
| `urn:oasis:names:tc:SAML:1.1:nameid-format:WindowsDomainQualifiedName` | `DOMAIN\user` form |
| `urn:oasis:names:tc:SAML:2.0:nameid-format:kerberos` | Kerberos principal |
| `urn:oasis:names:tc:SAML:2.0:nameid-format:entity` | Identifies the SAML entity itself (default for Issuer element) |
| `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent` | Persistent pseudonym: opaque, stable for a single SP, different across SPs; recommended as account association primary key |
| `urn:oasis:names:tc:SAML:2.0:nameid-format:transient` | Transient identifier, valid only for this session |

## Binding Parameters

### HTTP-Redirect Binding (URL Query Parameters)

| Parameter | Description |
|-----------|-------------|
| `SAMLRequest` / `SAMLResponse` | Message body: XML → raw deflate → Base64 → URL-encode (encoding details in [Typical Flows](./flows.md#redirect-url-encoding)) |
| `RelayState` | Opaque state, ≤80 bytes; recipient must echo unchanged |
| `SigAlg` | Signature algorithm URI, e.g., `http://www.w3.org/2001/04/xmldsig-more#rsa-sha256` |
| `Signature` | Signature over string `SAMLRequest(or SAMLResponse)=..&RelayState=..&SigAlg=..` (URL-encoded form, fixed order, only parameters actually present), Base64-encoded then URL-encoded |

### HTTP-POST Binding (Form Fields)

| Field | Description |
|-------|-------------|
| `SAMLRequest` / `SAMLResponse` | XML → Base64 (**no deflate**), submitted via browser auto-form POST |
| `RelayState` | Same as above |

Signature in POST Binding is embedded XML `<ds:Signature>`, not a separate field.

## Metadata Key Elements

### Common

| Element/Attribute | Description |
|-------------------|-------------|
| `<EntityDescriptor entityID>` | Root element; `entityID` is the entity identifier |
| `validUntil` / `cacheDuration` | Metadata validity/cache duration; consumer should periodically refresh |
| `<KeyDescriptor use="signing">` | Signature verification certificate (contains `<ds:X509Certificate>`); omitting `use` means signing/encryption dual-use |
| `<KeyDescriptor use="encryption">` | Encryption public key certificate |

### IdP Side (`<IDPSSODescriptor>`)

| Element/Attribute | Description |
|-------------------|-------------|
| `protocolSupportEnumeration` | Fixed to contain `urn:oasis:names:tc:SAML:2.0:protocol` |
| `<SingleSignOnService Binding Location>` | SSO endpoint; one per Binding |
| `<SingleLogoutService Binding Location>` | SLO endpoint |
| `WantAuthnRequestsSigned` | Whether to require SP to sign AuthnRequest |

### SP Side (`<SPSSODescriptor>`)

| Element/Attribute | Description |
|-------------------|-------------|
| `<AssertionConsumerService Binding Location index isDefault>` | ACS endpoint, can be multiple; `index` for reference by `AssertionConsumerServiceIndex` |
| `<SingleLogoutService>` | SP's SLO endpoint |
| `AuthnRequestsSigned` | SP commits to signing AuthnRequest |
| `WantAssertionsSigned` | SP requires Assertion be signed |
| `<NameIDFormat>` | List of NameID formats SP supports/expects |

## Troubleshooting Quick Reference

| Symptom | Common Causes |
|---------|--------------|
| IdP reports unable to parse SAMLRequest | Redirect Binding encoding order wrong (missing deflate / zlib header / URL-safe Base64 / double URL-encoding) |
| Signature validation failed | Peer certificate rotated but local Metadata not updated; signature/digest algorithm rejected (e.g., SHA-1 disabled); Redirect signature string concatenation order or URL encoding wrong; XML modified by middleware (formatting, charset) |
| Invalid Destination / Recipient | ACS or SSO endpoint URL mismatch: http vs https, port, trailing slash, reverse proxy rewrote Host header |
| Audience validation failure | SP Entity ID misconfigured (common: filled ACS URL as Entity ID in IdP) |
| Response expired / not yet valid | Clock offset between parties; SP not configured with clock skew tolerance; user lingered on IdP login page before submitting |
| InResponseTo mismatch | SP cluster doesn't share request ID storage (node A issued, node B received); user browser back/refresh consumed ID; IdP-initiated Response sent to SP that only accepts SP-initiated |
| Successful login but no attributes | IdP didn't configure Attribute Release policy; attribute name mismatch (short name vs URI/OID); Assertion encrypted and SP didn't decrypt before reading |
| Redirect loop (SP↔IdP bouncing) | SP session Cookie not set (SameSite/Secure/domain config wrong); SP always thinks not logged in |
| IdP reports unknown/invalid SP | AuthnRequest Issuer doesn't match IdP-registered Entity ID |
| Other SPs still online after SLO | One hop in SLO chain failed (check if `PartialLogout` returned); SP didn't save SessionIndex; browser blocked third-party cookies |
| Fails only on IE/certain proxies | URL too long (Redirect Binding message oversized); switch to POST Binding for AuthnRequest |

::: tip Troubleshooting Tools
Browser plugin SAML-tracer (Firefox/Chrome) can directly decode captured SAMLRequest/SAMLResponse. For backend investigation, Base64-decode and examine the XML source, then cross-check with this page's tables item by item. The vast majority of issues stem from URL/Entity ID/certificate configuration inconsistencies.
:::
