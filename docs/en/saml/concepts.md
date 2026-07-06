---
title: "Core Concepts"
---

# Core Concepts

This page builds up the SAML 2.0 conceptual framework from bottom to top: roles → Assertion → Protocol → Binding → Profile → Metadata, along with NameID, RelayState, and XML signatures/encryption that thread throughout.

## Roles

| Role | Description |
|------|-------------|
| **Principal** (Subject) | The entity being authenticated, typically the end user operating a browser |
| **IdP** (Identity Provider) | The party responsible for authenticating the Principal and issuing the Assertion; examples include Keycloak, AD FS, Okta, Azure AD |
| **SP** (Service Provider) | The party that consumes the Assertion and provides business services to the user; essentially the "relying party" application |

Each IdP and SP is identified by a globally unique **Entity ID** (typically a URI, such as `https://sp.example.com/saml/metadata`), which is included in the protocol message's `<Issuer>` element. The process of establishing trust between SP and IdP is fundamentally about **mutually registering each other's Entity ID, endpoint URLs, and signing certificates** (see Metadata below).

## Assertion (Assertion)

An Assertion is an XML statement document issued by the IdP, serving as the true bearer of "identity fact" in the entire protocol. A typical Assertion contains:

- `<Issuer>`: The issuer (IdP's Entity ID);
- `<Subject>`: Regarding whom (including NameID and SubjectConfirmation);
- `<Conditions>`: Validity conditions (time window via `NotBefore`/`NotOnOrAfter`, audience restriction via `<AudienceRestriction>`);
- One or more **Statement** (declarations).

Three Statement types:

| Statement | Element | Content | Practical Frequency |
|-----------|---------|---------|-------------------|
| Authentication Statement | `<AuthnStatement>` | When the subject completed authentication (`AuthnInstant`), by what method (`AuthnContextClassRef`, e.g., password, MFA); session index `SessionIndex` | Almost always present |
| Attribute Statement | `<AttributeStatement>` | Subject's attribute key-value pairs, such as email, displayName, group membership | Very commonly used |
| Authorization Decision Statement | `<AuthzDecisionStatement>` | Decision on whether the subject can execute a certain action on a certain resource (Permit/Deny) | Marked as deprecated (frozen direction) in specification; virtually never used in practice; authorization is typically delegated to XACML or the application itself |

A minimal Assertion skeleton:

```xml
<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="_a1b2c3d4" Version="2.0" IssueInstant="2026-07-03T08:30:00Z">
  <saml:Issuer>https://idp.example.org/saml/metadata</saml:Issuer>
  <!-- ds:Signature typically appears here -->
  <saml:Subject>
    <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
      alice@example.org
    </saml:NameID>
    <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
      <saml:SubjectConfirmationData Recipient="https://sp.example.com/saml/acs"
          NotOnOrAfter="2026-07-03T08:35:00Z" InResponseTo="_req001"/>
    </saml:SubjectConfirmation>
  </saml:Subject>
  <saml:Conditions NotBefore="2026-07-03T08:29:30Z" NotOnOrAfter="2026-07-03T08:35:00Z">
    <saml:AudienceRestriction>
      <saml:Audience>https://sp.example.com/saml/metadata</saml:Audience>
    </saml:AudienceRestriction>
  </saml:Conditions>
  <saml:AuthnStatement AuthnInstant="2026-07-03T08:30:00Z" SessionIndex="_sess42">
    <saml:AuthnContext>
      <saml:AuthnContextClassRef>
        urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
      </saml:AuthnContextClassRef>
    </saml:AuthnContext>
  </saml:AuthnStatement>
  <saml:AttributeStatement>
    <saml:Attribute Name="mail">
      <saml:AttributeValue>alice@example.org</saml:AttributeValue>
    </saml:Attribute>
  </saml:AttributeStatement>
</saml:Assertion>
```

## Protocol (Protocol Messages)

The Core specification defines a set of request/response protocol messages (namespace `urn:oasis:names:tc:SAML:2.0:protocol`, commonly abbreviated `samlp`):

| Message Pair | Purpose |
|--------------|---------|
| `<AuthnRequest>` → `<Response>` | SP requests IdP to authenticate user; IdP returns Response carrying Assertion. **The backbone of Web SSO** |
| `<LogoutRequest>` → `<LogoutResponse>` | Single Logout; can be initiated by either SP or IdP |
| `<ArtifactResolve>` → `<ArtifactResponse>` | In Artifact Binding, exchange a reference for the actual message (backend channel) |
| `<AttributeQuery>` → `<Response>` | Backend channel on-demand attribute query; rarely used in practice |
| `<ManageNameIDRequest>` etc. | NameID management/mapping; rarely used in practice |

All protocol messages share a common set of attributes: `ID` (unique identifier used for replay prevention and `InResponseTo` correlation), `Version="2.0"`, `IssueInstant` (issue time, UTC), `Destination` (receiving endpoint URL, which the receiver must validate matches their own).

## Binding (Binding)

Binding specifies how protocol messages are carried over a concrete transport layer. Which Binding to use is determined by the endpoint declared in Metadata.

| Binding | Transport Method | Characteristics & Limitations | Typical Use |
|---------|------------------|---------|-----------|
| **HTTP-Redirect** | Message is DEFLATE-compressed + Base64-encoded + URL-encoded and placed in query parameters, with 302 redirect | Limited by URL length, suitable only for small messages; signatures are attached as separate `SigAlg`/`Signature` query parameters (not XML signatures) | Sending `AuthnRequest`, `LogoutRequest` |
| **HTTP-POST** | Message is Base64-encoded and placed in an auto-submitted HTML form field (`SAMLRequest`/`SAMLResponse`), POSTed to recipient | No length limitation, can carry large messages with embedded XML signatures | Returning `Response` (most common), also for sending `AuthnRequest` |
| **HTTP-Artifact** | Frontend channel transmits only a short reference (artifact); recipient fetches the actual message via backend SOAP channel using `ArtifactResolve` | Message does not pass through browser, stronger against tampering/leakage, but requires network connectivity between SP and IdP, complex deployment | High-security scenarios, relatively rare in practice |
| **SOAP** | Direct server-to-server SOAP calls | Pure backend channel | ArtifactResolve, backend SLO, AttributeQuery |

::: tip Real-world Combination
The most prevalent combination is: **AuthnRequest uses HTTP-Redirect, Response uses HTTP-POST**. The reason is simple: AuthnRequest is small and fits in a URL; Response contains a signed Assertion and can be several KB to tens of KB, only suitable for POST.
:::

## Profile (Profile)

A Profile combines Core messages and Binding into end-to-end interoperable use cases:

- **Web Browser SSO Profile**: The most core Profile, defining SP-initiated and IdP-initiated login flows involving a browser, including allowed Binding combinations and mandatory validation rules (such as bearer SubjectConfirmation's `Recipient`/`NotOnOrAfter`/`InResponseTo` validation).
- **Single Logout Profile**: Defines how logout messages propagate among the parties involved in a session.
- Others: Enhanced Client or Proxy (ECP, non-browser clients), Identity Provider Discovery, Assertion Query, etc.; less frequently used.

Detailed flows are expanded step-by-step in [Typical Flows](./flows.md).

## Metadata (Metadata)

The Metadata specification defines a standard XML format for entity configuration, with root element `<EntityDescriptor>` (namespace `urn:oasis:names:tc:SAML:2.0:metadata`), containing:

- `entityID`: Entity identifier;
- `<IDPSSODescriptor>` or `<SPSSODescriptor>`: Role descriptor, declaring supported Bindings and endpoints (such as IdP's `<SingleSignOnService>`, SP's `<AssertionConsumerService>`, both parties' `<SingleLogoutService>`);
- `<KeyDescriptor use="signing|encryption">`: Embedded X.509 certificate, declaring the signature verification public key and encryption public key;
- SP side can also declare policy switches like `AuthnRequestsSigned`, `WantAssertionsSigned`, etc.

**Certificate exchange is the core of trust establishment**: The SP obtains the IdP's signing certificate from IdP Metadata to verify Response/Assertion signatures; the IdP obtains the SP's certificate from SP Metadata to verify AuthnRequest signatures and encrypt Assertions. In practice, Metadata XML files or Metadata URLs are typically exchanged directly, avoiding manual entry errors.

::: warning Certificate Rotation
SAML trust is based on the exchanged certificates themselves (not CA chains). If certificates expire or are rotated and the peer's Metadata is not synchronized, it directly causes signature verification failure and prevents all users from logging in. During rotation, new and old `<KeyDescriptor>` entries should coexist in Metadata; only after the peer updates should the old certificate be removed.
:::

## NameID and NameID Format

`<NameID>` is the core element in an Assertion that identifies the subject; the `Format` attribute declares the semantics of its value. Common Formats:

| Format URI (shorthand) | Meaning |
|--------------------|--------|
| `...:1.1:nameid-format:emailAddress` | Email format |
| `...:1.1:nameid-format:unspecified` | Unspecified; semantics agreed upon by both parties |
| `...:2.0:nameid-format:persistent` | Persistent pseudonym: stable and opaque identifier for the same SP, different across SPs, protecting privacy |
| `...:2.0:nameid-format:transient` | Transient identifier: different for each session, meaningful only within the session |

The SP declares the desired Format in the `<NameIDPolicy>` of the `AuthnRequest`. The complete list is in the [Reference Page](./reference.md#nameid-format-list).

::: tip
When mapping accounts in business systems, **do not rely on email as an immutable primary key** (email addresses change). Preferentially require the IdP to issue a `persistent` NameID or attach an immutable employee ID / immutable ID in Attributes.
:::

## RelayState

RelayState is an opaque parameter transmitted alongside the SAML message but **not part of the SAML message itself** (in Redirect Binding it's a query parameter; in POST Binding it's a form field). The specification limits its length to no more than 80 bytes.

- **SP-initiated flow**: The SP attaches RelayState when sending AuthnRequest; the IdP must echo it back unchanged. The SP typically uses it to record the "deep link the user wanted to access before login" and jumps there after successful login.
- **IdP-initiated flow**: RelayState is configured on the IdP side, typically filled with the target URL or an IdP-agreed identifier.

::: danger Security Alert
RelayState is not signed and comes from untrusted input. Before the SP uses it for redirection, it must perform **open redirect validation** (only allowing relative paths on the same site or whitelisted domains), otherwise it becomes a phishing vector. A more robust approach is to pass only a random key, with the actual URL stored in the SP's local session/cache.
:::

## XML Signatures and Encryption

### Where Signatures Appear

SAML uses XML-DSig **enveloped signature** (signature embedded within the signed element, `<ds:Signature>` immediately following `<Issuer>`), appearing at three levels:

1. **Assertion signature**: Signed on `<saml:Assertion>`, most important, nearly all IdPs enable it by default;
2. **Response signature**: Signed on the outer `<samlp:Response>`, can coexist with Assertion signature;
3. **AuthnRequest / LogoutRequest signature**: In POST Binding it's an XML signature; **in Redirect Binding it is not an XML signature**, but a detached signature of the string `SAMLRequest=...&RelayState=...&SigAlg=...`, placed in the `Signature` query parameter.

For signature algorithms, use `rsa-sha256` or higher; **reject `rsa-sha1`**; likewise for digest.

### What the SP Must Do When Verifying Signatures

1. Use **the certificate registered in Metadata** to verify signatures, not the embedded `<ds:KeyInfo>` certificate within the message (embedded certificates can only be used for key selection, not as trust anchors);
2. Confirm that the signature's `Reference` covers exactly the Assertion/Response element currently being processed (preventing **XML Signature Wrapping** attacks: attacker moves a legitimate signature node and inserts a forged node; the countermeasure is "first locate the signed element by ID, verify reference uniqueness, then read business data from that node," and use well-maintained SAML libraries rather than hand-written DOM processing);
3. If the configuration requires Assertion to be signed, an outer Response signature **cannot substitute** for the Assertion signature requirement, and vice versa; enforce according to local policy.

### Encryption

Beyond signatures, the IdP can also encrypt the entire Assertion using the SP's encryption public key, producing `<saml:EncryptedAssertion>` (XML-Enc, typically RSA-OAEP wrapping an AES session key for hybrid encryption); similarly there are `<EncryptedID>` and `<EncryptedAttribute>`. Encryption addresses **confidentiality of messages when passing through the browser** (in POST Binding, Response lands in the browser). The transport layer must always be HTTPS; encryption is defense-in-depth on top of that. When Assertions contain sensitive attributes, enabling encryption is recommended.

---

Next: Read [Typical Flows](./flows.md) to see how these concepts form complete login/logout interactions, or directly consult [Parameters and Message Reference](./reference.md).
