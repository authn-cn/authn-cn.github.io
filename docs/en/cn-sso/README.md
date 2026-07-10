---
title: "China-Platform SSO Integration"
---

# China-Platform SSO Integration (Feishu / DingTalk)

China's platforms—Feishu, DingTalk, WeCom, and the like—**can all do enterprise SSO**, but how closely they align with the standard protocols (SAML / OIDC) varies widely, and the pitfalls are completely different from integrating with Okta or Entra ID. This page spells out those differences.

## First, distinguish the two directions

"Enterprise SSO integration" has two very different meanings, and you must be clear about which one you are doing:

| Direction | Role the platform plays | Typical goal |
|------|--------------|---------|
| **A. Use existing corporate accounts to log in to Feishu/DingTalk** | Platform = **SP** (Service Provider) | The company already has an IdP (AD / Okta / IDaaS) and wants employees to log in to Feishu/DingTalk with a single unified account |
| **B. Use Feishu/DingTalk accounts to log in to other systems** | Platform = **IdP** / identity source | Use Feishu/DingTalk as the login entry point—scan a QR code to sign in to an OA system, cloud desktop, etc. |

The protocols a single platform supports in the two directions are often **different**, and this is exactly where vague marketing like "supports OAuth2/OIDC/SAML" on the official site is most misleading.

## Feishu

### Direction A: Feishu as SP — SAML 2.0 only

Under **Admin Console → Company Settings → SSO Account Login**, where you configure "log in to Feishu with a corporate IdP," Feishu **only supports SAML 2.0** (and it is usually only unlocked on the **Flagship edition**). Every official example (Okta, Google Workspace, ADFS, Bamboo Cloud, Authing) is SAML across the board; that screen has **no** OIDC / OAuth2 / CAS option.

::: warning Don't be misled by "Feishu supports OIDC/OAuth2"
Those claims refer to **Direction B (Feishu as IdP)** or to building apps on the Feishu integration platform—not to the "log in to Feishu" SP scenario. On the SP side there is exactly one option: SAML 2.0.
:::

### The two tough parts of Feishu SAML

1. **No IdP metadata import.** Feishu does not accept metadata XML; you must enter the IdP's **login URL (SSO URL), Issuer/Entity ID, and signing certificate** field by field. The Public Certificate must be **bare base64**—you have to strip off the `-----BEGIN CERTIFICATE-----` / `-----END CERTIFICATE-----` header and footer.
2. **Hardcoded certificate, manual rotation.** Feishu stores the certificate itself, not a "metadata URL that auto-syncs." Once the IdP rotates its signing certificate, logins will suddenly fail if you don't update it on the Feishu side.

> 🔧 With the [Feishu SAML SSO Helper](../tools/feishu-saml.md) you can: parse IdP metadata in one click into the fields above that must be entered by hand (with the certificate header/footer already stripped); and, in reverse, generate Feishu's SP metadata to upload to the IdP.

### Feishu's SP parameters are fixed (per region)

Feishu **does not give you** a metadata file, but the SP parameters it needs are in fact **fixed constants** that vary only by region (not by enterprise). Per the official docs, just enter the values below into your IdP:

| Region / login domain | ACS URL (Single Sign-On URL) | SP Entity ID (Audience URI) |
|------|------|------|
| **Feishu China** (`*.feishu.cn`) | `https://www.feishu.cn/suite/passport/authentication/idp/saml/call_back` | `https://www.feishu.cn` |
| Lark Global (`*.larksuite.com`) | `https://www.larksuite.com/suite/passport/authentication/idp/saml/call_back` | `https://www.larksuite.com` |
| Lark Singapore (`*.sg.larksuite.com`) | `https://www.sg.larksuite.com/suite/passport/authentication/idp/saml/call_back` | `https://www.sg.larksuite.com` |
| Lark Japan (`*.jp.larksuite.com`) | `https://www-jp.larksuite.com/suite/passport/authentication/idp/saml/call_back` | `https://www-jp.larksuite.com` |

Key points:

- These values are **fixed per region** and unrelated to your enterprise. The **enterprise domain (`xxx.feishu.cn`) is only typed at login time** to route to your tenant — it does not appear in the SAML endpoints.
- The ACS binding is **HTTP-POST**; in Okta, tick "Use this for Recipient URL and Destination URL" (Recipient / Destination = ACS).
- You **must configure an `email` attribute on the IdP** (value = the user's email); Feishu matches members by email, so both sides must match.
- When entering the IdP certificate into Feishu, **strip the `-----BEGIN/END CERTIFICATE-----` markers** and keep only the body.

> 🔧 The [Feishu SAML SSO Helper](../tools/feishu-saml.md) has these per-region fixed values built in: pick a region and it generates Feishu's standard SP metadata, ready to upload to IdPs (Okta / Entra ID) that **support import**. The generated metadata also declares the required `email` attribute via `AttributeConsumingService` / `RequestedAttribute` (the proper SP↔IdP convention); note, however, that Okta / Entra **won't auto-release attributes based on it** — you still add the `email` attribute manually on the IdP. Only a few IdPs (e.g. Shibboleth) drive release from metadata.

### NameID and user matching

Feishu matches an incoming SAML assertion to a Feishu user by its **NameID**, commonly `emailAddress` (email) or the login name. Make sure the NameID value in the IdP assertion matches the corresponding field on the Feishu member; otherwise the login will succeed but fail to map to a person.

### Direction B: Feishu as IdP — where OIDC / metadata actually appear

Conversely, when you use a Feishu account to log in to other systems, the Feishu integration platform supports a richer set of protocols (SAML, OIDC, OAuth2, etc.) and **can download a metadata document**. So the "metadata download" capability appears in Feishu **only when it is the IdP, not when it is the SP**—another easily confused point.

## DingTalk

DingTalk's situation is even more "non-standard":

- **No native standard SAML, and no native standard OIDC either.** DingTalk login is its own OAuth2 variant (`login.dingtalk.com/oauth2/auth` plus a proprietary user-info endpoint), whose fields (`userid`, etc.) are proprietary and must be mapped by hand into standard claims like `sub` / `email`.
- **Dedicated DingTalk (dedicated edition)** is the only one that supports accepting an external IdP: it uses the **OIDC implicit flow** with `id_token` checked, matches users via the `sub` in the `id_token`, and is limited to SSO-type accounts.
- Therefore, **to integrate DingTalk over standard SAML/OIDC, the industry commonly adds a layer of IDaaS middleware** (Alibaba Cloud IDaaS, Bamboo Cloud, Ningdun, etc.) as a bridge: the IDaaS exposes standard protocols outward and talks to DingTalk's proprietary OAuth2 inward.

## The one-line comparison

| Platform (as SP) | Native SAML | Native standard OIDC | Metadata import | Real-world approach |
|------|:--------:|:------------:|:----:|---------|
| **Feishu** | ✅ (Flagship edition) | ❌ | ❌ manual field entry | Configure SAML directly; watch out for manual certificate rotation |
| **DingTalk** | ❌ | ❌ (proprietary OAuth2 only) | ❌ | Usually bridged via IDaaS; the dedicated edition can accept OIDC |

## Related tools and docs

- [Feishu SAML SSO Helper](../tools/feishu-saml.md) — parse IdP metadata / generate Feishu SP metadata
- [SAML Metadata Parser](../tools/saml-metadata.md) · [SAML Response Parser](../tools/saml-parse.md) · [X.509 Certificate Parser](../tools/cert.md)
- [SAML 2.0 docs](../saml/) · [OIDC docs](../oidc/) · [OAuth 2.0 docs](../oauth2/)

## Sources

The conclusions on this page are based on the following official and authoritative documents (all in Chinese; if a page changes, defer to each vendor's latest docs):

**Feishu**

- [Log in to Feishu with SSO — Feishu Help Center](https://www.feishu.cn/hc/zh-CN/articles/360043576234)
- [Admin: configure SAML 2.0 SSO login (Okta IdP example)](https://www.feishu.cn/hc/zh-CN/articles/360049067599)
- [Admin: configure SAML 2.0 SSO login (Google Workspace IdP example)](https://www.feishu.cn/hc/zh-CN/articles/335787416164)
- [Lark per-region fixed SAML parameters (Okta / Google)](https://www.larksuite.com/hc/en-US/articles/360048487935-admin-configure-saml-2.0-sso-login-okta-or-google)
- [Integrating an enterprise SSO system with Feishu's identity system](https://www.feishu.cn/hc/zh-CN/articles/879974570764)

**DingTalk**

- [Single sign-on (SSO) overview — DingTalk Open Platform](https://open.dingtalk.com/document/orgapp/sso-overview)
- [SSO to applications from the DingTalk workbench — Alibaba Cloud IDaaS](https://help.aliyun.com/zh/idaas/eiam/use-cases/log-on-to-applications-from-dingtalk-through-sso)
- [Configure dedicated-DingTalk SSO — Alibaba Cloud IDaaS](https://help.aliyun.com/zh/idaas/eiam/user-guide/dedicated-dingtalk-sso)
- [Integrating DingTalk SSO (custom OIDC adapter) best practices — Guance](https://www.guance.com/learn/articles/guance-dingding-oidc)
