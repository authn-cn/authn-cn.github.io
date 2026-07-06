---
title: PEM → JWK
---

# PEM → JWK 转换

粘贴 PEM 密钥,转换为 JWK(JSON)。支持 SPKI 公钥(`BEGIN PUBLIC KEY`)与 PKCS#8 私钥(`BEGIN PRIVATE KEY`),RSA 与 EC 均可。默认只输出公钥参数并附 [RFC 7638](https://datatracker.ietf.org/doc/html/rfc7638) Thumbprint 作为 `kid`;可勾选一并导出私钥字段。纯浏览器本地转换,不上传。

<ClientOnly>
  <PemToJwk />
</ClientOnly>

::: tip 相关工具
反向(JWK → PEM)见 [JWK / JWKS → PEM](./jwk-convert.md);想看任意 PEM 是什么用 [PEM 解析器](./pem-parse.md);要生成全新密钥对用 [JWK 生成器](./jwk.md)。
:::

<script setup>
import PemToJwk from '@components/PemToJwk.vue'
</script>
