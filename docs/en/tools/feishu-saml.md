---
title: Feishu SAML SSO Helper
---

# Feishu SAML SSO Helper

When Feishu acts as an SP integrating with a corporate IdP, it **only supports SAML 2.0, and it cannot import IdP metadata**—you have to fill in the fields by hand in the admin console. This tool removes the two points of friction in that round trip:

- **Parse IdP Metadata → Feishu fields**: paste the metadata exported from Okta / Entra ID / ADFS / IDaaS, and it automatically extracts the **Issuer, login URL, logout URL, and NameID format** you need to paste into Feishu, plus the Public Certificate with the **`-----BEGIN/END-----` header and footer stripped off** (Feishu's field only accepts the bare base64).
- **Generate Feishu SP Metadata**: Feishu's SP parameters are **fixed per region** (China feishu.cn / Global / Singapore / Japan) and are built into the tool. Pick a region and the **ACS URL / SP Entity ID** fill in automatically, assembling a standard SP metadata document (including the certificate and NameIDFormat) to upload to any IdP that supports importing it.

<ClientOnly>
  <FeishuSamlHelper />
</ClientOnly>

::: warning The certificate rotation trap
The IdP signing certificate in Feishu is **hardcoded**. After the IdP rotates its signing certificate, you must go back into Feishu and **update it manually**, or logins will start failing without warning. All computation runs locally in your browser; metadata and certificates are never uploaded.
:::

For the full background on Feishu SP SSO (why it is SAML-only, the field mapping, and the differences from DingTalk), see [China-Platform SSO Integration](../cn-sso/). For general parsing of metadata structure, see [SAML Metadata Parser](./saml-metadata.md).

<script setup>
import FeishuSamlHelper from '@components/FeishuSamlHelper.vue'
</script>
