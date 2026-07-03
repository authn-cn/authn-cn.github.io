---
title: JWT 解析器
---

# JWT 在线解析

粘贴一个 JWT（支持带 `Bearer ` 前缀）,即可查看解码后的 Header 与 Payload。时间类 claims（`exp` / `nbf` / `iat` / `auth_time`）会自动转换为本地时间并判断有效性。

<ClientOnly>
  <JwtDecoder />
</ClientOnly>

## 关于 JWT

JWT（JSON Web Token,RFC 7519）由三段 Base64URL 编码的内容组成,用 `.` 分隔：

```
Header.Payload.Signature
```

- **Header**：声明签名算法（`alg`）与类型（`typ`）,可能带密钥标识 `kid`
- **Payload**：claims 集合,如 `iss`（签发者）、`sub`（主体）、`aud`(受众)、`exp`(过期时间)
- **Signature**：对前两段的签名,防篡改

::: warning 解码 ≠ 验证
JWT 的前两段只是编码而非加密,任何人都能解码。服务端**必须验证签名**（以及 `iss` / `aud` / `exp`）之后才能信任其内容。详见 [OIDC 核心概念](../oidc/concepts.md) 中的 ID Token 校验清单。
:::

<script setup>
import JwtDecoder from '@components/JwtDecoder.vue'
</script>
