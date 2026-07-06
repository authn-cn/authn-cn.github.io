---
title: "Typical Flows"
---

# Typical Flows

This page covers the three most important flows: SP-initiated SSO, IdP-initiated SSO, and Single Logout (SLO). Before reading, it's recommended to familiarize yourself with Binding and Assertion structure in [Core Concepts](./concepts.md).

The examples below assume:

- SP Entity ID: `https://sp.example.com/saml/metadata`, ACS address: `https://sp.example.com/saml/acs`
- IdP Entity ID: `https://idp.example.org/saml/metadata`, SSO address: `https://idp.example.org/sso`

## SP-initiated SSO (Redirect + POST)

The most common combination: AuthnRequest uses HTTP-Redirect Binding, Response uses HTTP-POST Binding.

### Step-by-step Flow

1. User visits SP's protected resource `https://sp.example.com/app/dashboard`; SP detects no local session.
2. SP generates `<AuthnRequest>`, records its `ID` (for validating `InResponseTo` later), stores the expected return deep link in RelayState (or stores locally and uses only a key in RelayState).
3. SP **DEFLATE-compresses → Base64-encodes → URL-encodes** the AuthnRequest and 302-redirects the browser to the IdP SSO endpoint with this as a query parameter.
4. Browser requests IdP. IdP validates AuthnRequest (is Issuer a registered SP, is `AssertionConsumerServiceURL` consistent with Metadata, signature if required).
5. User completes authentication at IdP (enters password/MFA; if IdP already has a session, skips login page).
6. IdP constructs `<Response>` (containing a signed Assertion, with `InResponseTo` set to the AuthnRequest's ID), Base64-encodes it, and places it in an auto-submitted form, returning to browser.
7. Browser automatically POSTs the form (`SAMLResponse` + `RelayState`) to the SP's ACS (Assertion Consumer Service) endpoint.
8. SP completes all validations (see validation checklist below), creates a local session, and redirects to `https://sp.example.com/app/dashboard` according to RelayState.

### AuthnRequest Example

```xml
<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_req_8f3a2b1c9d4e"
    Version="2.0"
    IssueInstant="2026-07-03T08:29:55Z"
    Destination="https://idp.example.org/sso"
    AssertionConsumerServiceURL="https://sp.example.com/saml/acs"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>https://sp.example.com/saml/metadata</saml:Issuer>
  <samlp:NameIDPolicy
      Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
      AllowCreate="true"/>
  <samlp:RequestedAuthnContext Comparison="exact">
    <saml:AuthnContextClassRef>
      urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
    </saml:AuthnContextClassRef>
  </samlp:RequestedAuthnContext>
</samlp:AuthnRequest>
```

### Redirect URL Encoding

Steps for generating the `SAMLRequest` parameter in Redirect Binding (order matters):

1. **DEFLATE compression**: Perform raw deflate (RFC 1951, **without zlib header**, i.e., Python `zlib.compress(data, 9)[2:-4]` or `wbits=-15`);
2. **Base64 encoding** (standard alphabet, not URL-safe variant);
3. **URL encoding** (percent-encoding, because Base64 output contains `+`, `/`, `=`).

```http
GET /sso?SAMLRequest=fZJNb9swDIbv%2BRUC77bl2E1qIU6...
    &RelayState=%2Fapp%2Fdashboard
    &SigAlg=http%3A%2F%2Fwww.w3.org%2F2001%2F04%2Fxmldsig-more%23rsa-sha256
    &Signature=GtN2t7Jf...%3D HTTP/1.1
Host: idp.example.org
```

If signing the request: compute the signature on the string `SAMLRequest=<v>&RelayState=<v>&SigAlg=<v>` (each value in URL-encoded form, in this fixed order, only including parameters that are actually present), Base64-encode it, and attach as the `Signature` parameter. **Redirect Binding signatures are not inside the XML**.

::: warning Common Encoding Errors
- Forgot deflate, or used compression with zlib header → IdP reports "unable to inflate/parse request";
- Used URL-safe Base64 → decoding fails;
- Double-encoded already-encoded string, or framework auto-decoded then you decoded again → `%`-related parsing errors.
:::

### Response Example

IdP sends Response back to SP via auto-submitted form:

```http
POST /saml/acs HTTP/1.1
Host: sp.example.com
Content-Type: application/x-www-form-urlencoded

SAMLResponse=PHNhbWxwOlJlc3BvbnNlIC4uLg%3D%3D&RelayState=%2Fapp%2Fdashboard
```

After Base64-decoding `SAMLResponse` (POST Binding has **only Base64, no deflate**):

```xml
<samlp:Response
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_resp_5e6f7a8b"
    Version="2.0"
    IssueInstant="2026-07-03T08:30:10Z"
    Destination="https://sp.example.com/saml/acs"
    InResponseTo="_req_8f3a2b1c9d4e">
  <saml:Issuer>https://idp.example.org/saml/metadata</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion ID="_asrt_9c0d1e2f" Version="2.0"
                  IssueInstant="2026-07-03T08:30:10Z">
    <saml:Issuer>https://idp.example.org/saml/metadata</saml:Issuer>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <ds:Reference URI="#_asrt_9c0d1e2f">
          <ds:Transforms>
            <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          </ds:Transforms>
          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <ds:DigestValue>Kx7...=</ds:DigestValue>
        </ds:Reference>
      </ds:SignedInfo>
      <ds:SignatureValue>hR4k...=</ds:SignatureValue>
    </ds:Signature>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
        alice@example.org
      </saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData
            Recipient="https://sp.example.com/saml/acs"
            NotOnOrAfter="2026-07-03T08:35:10Z"
            InResponseTo="_req_8f3a2b1c9d4e"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="2026-07-03T08:29:40Z"
                     NotOnOrAfter="2026-07-03T08:35:10Z">
      <saml:AudienceRestriction>
        <saml:Audience>https://sp.example.com/saml/metadata</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="2026-07-03T08:30:10Z"
                         SessionIndex="_sess_20260703_42">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>
          urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
        </saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="mail"
          NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>alice@example.org</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="displayName"
          NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>Alice Zhang</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>
```

### SP-side Validation Checklist (All Required)

1. `Status/StatusCode` is `Success`;
2. Verify signature (using certificate registered in Metadata; per policy, Assertion and/or Response must be signed);
3. `Issuer` equals the expected IdP Entity ID;
4. `Destination` and `SubjectConfirmationData/@Recipient` equal this SP's ACS URL;
5. `InResponseTo` matches an unconsumed AuthnRequest ID on this SP; immediately invalidate that ID after matching;
6. `Conditions` time window is valid, `<Audience>` contains this SP's Entity ID;
7. Assertion `ID` has not been processed before (replay prevention; cache seen IDs within the validity window).

### Common Pitfalls

::: warning Common Pitfalls
- **Clock skew**: A few dozen seconds difference between IdP and SP clocks will trigger `NotBefore`/`NotOnOrAfter` boundaries. Both sides should enable NTP; SP validation should allow 2–3 minutes of clock skew tolerance, but not 5 minutes or more.
- **Missing Audience validation**: Without validating `<Audience>`, an IdP-signed Assertion for app A can be used to log into app B (horizontal escalation on the same IdP). Audience comparison uses the **SP Entity ID**, not the ACS URL.
- **Missing InResponseTo validation**: Without it, you cannot prevent replay/injection; attackers can inject captured Responses into arbitrary sessions. Note: IdP-initiated flow has no InResponseTo, so SP must clearly differentiate the two modes' validation policies.
- **ACS URL using HTTP or wildcards**: ACS must be an exact-match HTTPS address.
- **RelayState open redirect**: See [Core Concepts](./concepts.md#relaystate).
:::

## IdP-initiated SSO

User clicks an application icon from the IdP portal (app list) and enters the SP directly, **without an AuthnRequest phase**.

### Step-by-step Flow

1. User logs into IdP portal, clicks target application icon;
2. IdP directly constructs a signed Response for that SP (**no `InResponseTo`**); RelayState is filled according to IdP-side configuration (typically the target URL);
3. Browser POSTs the form to the SP's ACS;
4. SP validates and establishes session (skips InResponseTo validation; all other validations are the same as SP-initiated).

### Security Considerations

::: danger Inherent Weakness of IdP-initiated

Because Response doesn't correspond to any SP-initiated request, SP cannot bind the message to its own flow through `InResponseTo`, therefore:

- **Inherently cannot prevent Response injection/CSRF-style login** (attacker can POST their legitimate Assertion into victim's browser, causing victim to "be logged in" to attacker's account, known as Login CSRF);
- Can only fallback to: extremely short Assertion validity period, strict single-use ID replay prevention, strict Audience/Recipient validation;
- If possible, disable it: If not required by business needs, SP should **disable IdP-initiated by default**. IdP portal icons can be configured to trigger SP-initiated flow (redirect to SP's login initiation URL) to achieve both UX and security.
:::

## Single Logout (SLO)

SLO aims to end the user's session at the IdP and all logged-in SPs. The messages are `<LogoutRequest>`/`<LogoutResponse>`, with frontend channels commonly using HTTP-Redirect Binding. The IdP relies on the `SessionIndex` and NameID in the login-time Assertion to locate the session to terminate.

### SP-initiated SLO

1. User clicks "logout" at SP1. SP1 terminates its local session and sends a signed `<LogoutRequest>` to the IdP's SLO endpoint (Redirect Binding, containing NameID and SessionIndex);
2. IdP validates, then iterates over other SPs involved in that IdP session (SP2, SP3, …), sending `<LogoutRequest>` to each via browser redirect; each SP terminates its session and returns `<LogoutResponse>`;
3. IdP terminates its own session and finally returns `<LogoutResponse>` to the initiating SP1 (Status may be Success or PartialLogout);
4. SP1 displays "logged out" page.

Example `LogoutRequest`:

```xml
<samlp:LogoutRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_lo_3c4d5e6f" Version="2.0"
    IssueInstant="2026-07-03T09:00:00Z"
    Destination="https://idp.example.org/slo">
  <saml:Issuer>https://sp.example.com/saml/metadata</saml:Issuer>
  <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
    alice@example.org
  </saml:NameID>
  <samlp:SessionIndex>_sess_20260703_42</samlp:SessionIndex>
</samlp:LogoutRequest>
```

### IdP-initiated SLO

1. User clicks "global logout" in IdP portal (or administrator forces logout);
2. IdP sends `<LogoutRequest>` to each SP involved in the session and collects `<LogoutResponse>` from each;
3. IdP terminates its own session and displays results.

### Common Pitfalls

::: warning Common Pitfalls
- **SLO has a notorious fragility problem**: Frontend-channel SLO relies on the browser to redirect sequentially through all SPs; if any SP endpoint hangs/times out/has cert errors, the chain breaks and subsequent SPs don't receive the logout notification. Always handle and report `PartialLogout` status correctly; don't mislead users into thinking "all logged out."
- **SessionIndex not saved**: If SP doesn't save `SessionIndex` from the login Assertion into its local session, it can't fill it in LogoutRequest; some IdPs will refuse or log out all user sessions as a result.
- **LogoutRequest must be verified**: Unsigned/unverified LogoutRequest can be weaponized as a DoS—attackers can arbitrarily kick users offline.
- **Third-party cookie restrictions**: Browser restrictions on third-party cookies in iframes can break iframe-based parallel SLO; prefer sequential redirect approach.
- **Timeout fallback**: Many real-world deployments end up with "local logout only + short IdP session timeout"; if adopted, explicitly communicate residual risk to security team (other SP sessions still active).
:::

---

For item-by-item element/parameter meanings, see [Typical Parameters and Message Reference](./reference.md).
