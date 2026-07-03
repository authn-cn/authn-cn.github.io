---
title: PKCE 生成器
---

# PKCE 生成器

为 OAuth 2.0 / OIDC 授权码流程生成 PKCE 的 `code_verifier` 与 `code_challenge`(S256),以及 `state`、`nonce` 随机值。全部在浏览器本地生成。

<ClientOnly>
  <PkceTool />
</ClientOnly>

## 怎么用

1. 授权请求(authorization endpoint)带上 `code_challenge` 与 `code_challenge_method=S256`,以及 `state`、`nonce`;
2. 换取令牌(token endpoint)时带上 `code_verifier`;
3. 授权服务器用 `SHA-256(code_verifier)` 与之前的 `code_challenge` 比对。

详见 [OAuth 2.0 核心概念](../oauth2/concepts.md) 中的 PKCE 说明。

<script setup>
import PkceTool from '@components/PkceTool.vue'
</script>
