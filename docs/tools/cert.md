---
title: X.509 证书解析
---

# X.509 证书解析

粘贴 PEM 证书(或纯 base64 DER),解析出主体、颁发者、有效期、序列号、公钥/签名算法,以及 SHA-1 / SHA-256 指纹。纯浏览器本地解析 ASN.1,证书不会上传。

<ClientOnly>
  <CertViewer />
</ClientOnly>

::: tip SAML 场景
SAML Metadata 里 `<ds:X509Certificate>` 的内容就是 base64 DER,可直接粘进来查看 IdP/SP 的签名证书信息与有效期。
:::

<script setup>
import CertViewer from '@components/CertViewer.vue'
</script>
