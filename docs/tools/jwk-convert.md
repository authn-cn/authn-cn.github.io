---
title: JWK / JWKS → PEM
---

# JWK / JWKS → PEM 转换

粘贴单个 JWK 或整个 JWKS,转换为 PEM 公钥(SPKI),并展示每个密钥的 `kty` / `alg` / `use` / `kid`、以及按 [RFC 7638](https://datatracker.ietf.org/doc/html/rfc7638) 计算的 JWK Thumbprint。支持 RSA 与 EC;含私钥字段时仅导出公钥部分。纯浏览器本地转换,不上传。

<ClientOnly>
  <JwkConverter />
</ClientOnly>

::: tip 从哪拿 JWKS
用 [OIDC Discovery 查看器](./discovery.md) 拉取任意 OP 的 `jwks_uri`,把其中的 key 粘进来即可转成 PEM,用于 [JWT 验签](./jwt.md)。反向(生成密钥)见 [JWK 生成器](./jwk.md)。
:::

<script setup>
import JwkConverter from '@components/JwkConverter.vue'
</script>
