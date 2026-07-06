---
title: SAML Login Demo
---

# SAML Login Demo (Real Flow)

Below is a **real, clickable** SAML 2.0 Web Browser SSO demo, with the Identity Provider being this site's [Mock SAML IdP](./saml.md). After selecting a test user:

1. The demo SP generates an `AuthnRequest` (with unique `ID`);
2. Browser requests Mock IdP, IdP verifies the user (in the demo, directly specifying alice / bob, skipping the user selection page) and issues a **signed SAML Response**;
3. This page decodes base64, extracts the signed `Response` XML;
4. Validates item by item: `StatusCode`, `InResponseTo` (associated with AuthnRequest), `Audience`, `Conditions` time window, and verifies the signature using the assertion's **embedded certificate's public key** (RSA-SHA256);
5. Reads `NameID` and attributes from the assertion.

<ClientOnly>
  <SamlDemo />
</ClientOnly>

## What This Demo Shows

- **Signed assertion**: IdP uses private key to sign the assertion, SP uses IdP certificate to verify, ensuring the assertion is unmodified and truly from the trusted IdP.
- **`InResponseTo` association**: The returned Response associates with the `ID` of the original `AuthnRequest`, preventing assertion misattribution or replay (analogous to OIDC's `state`).
- **`Audience` restriction**: The assertion declares it is only valid for this SP (entityID); other SPs cannot reuse it.
- **`Conditions` time window**: `NotBefore` / `NotOnOrAfter` restrict the assertion's validity period.

::: tip About Signature Verification
In real systems, SAML signature verification is performed **by the SP server**, requiring XML canonicalization (exc-c14n). This demo verifies the `SignedInfo`'s RSA-SHA256 signature in the browser; complete verification also requires comparing `DigestValue` and certificate trust chain—this site's [Mock SP console](https://mock.authn.tech/saml/sp/) used industry library `xml-crypto` for authoritative server-side verification.
:::

For the equivalent OIDC flow, see [OIDC Login Demo](./demo.md).

<script setup>
import SamlDemo from '@components/SamlDemo.vue'
</script>
