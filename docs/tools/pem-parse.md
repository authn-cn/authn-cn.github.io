---
title: PEM 解析器
---

# PEM 解析器

粘贴任意 PEM 文本(可同时包含多个块,如整条证书链 + 公钥),自动识别每个块的类型(证书、CSR、SPKI 公钥、PKCS#8 私钥、PKCS#1 / SEC1 旧式私钥、CRL 等),显示 DER 字节长度,并尽可能给出密钥算法与位数/曲线;证书块会附主体、颁发者、有效期与指纹摘要。纯浏览器本地解析,不上传。

<ClientOnly>
  <PemInspector />
</ClientOnly>

::: tip 相关工具
证书完整字段用 [X.509 解析](./cert.md);把密钥转成 JWK 用 [PEM → JWK](./pem-to-jwk.md)。
:::

<script setup>
import PemInspector from '@components/PemInspector.vue'
</script>
