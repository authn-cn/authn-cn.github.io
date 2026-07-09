---
title: JWK / 密钥对生成
---

# JWK / 密钥对生成

一键生成 RSA 或 EC 密钥对,导出公钥/私钥 JWK、JWKS(可直接放到 `jwks_uri` 端点)以及 PEM(SPKI / PKCS#8)。`kid` 按 [RFC 7638](https://datatracker.ietf.org/doc/html/rfc7638) JWK Thumbprint 计算。密钥在浏览器本地生成,不会上传。

<ClientOnly>
  <JwkGenerator />
</ClientOnly>

::: tip 配套使用
生成的私钥可用于 [JWT 签名](./jwt-sign.md),公钥 JWK/JWKS 可用于 [JWT 验签](./jwt.md)。JWK/JWKS 在 JOSE 家族中的定位见 [JWT / JOSE 文档](../jwt/)。
:::

<script setup>
import JwkGenerator from '@components/JwkGenerator.vue'
</script>
