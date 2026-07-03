---
title: JWT 签名生成
---

# JWT 签名生成

填入 Payload 与密钥,生成一个签好名的 JWT,方便造测试 token。支持 HMAC(`HS*`)、RSA(`RS*` / `PS*`)、ECDSA(`ES*`);非对称算法可一键生成匹配的测试密钥对。所有运算在浏览器本地完成,密钥不会上传。

<ClientOnly>
  <JwtSigner />
</ClientOnly>

::: warning 仅用于测试
请勿在此填入生产私钥。生成的 token 可用 [JWT 验签工具](./jwt.md) 校验,或搭配 [JWK 生成器](./jwk.md) 的密钥使用。
:::

<script setup>
import JwtSigner from '@components/JwtSigner.vue'
</script>
