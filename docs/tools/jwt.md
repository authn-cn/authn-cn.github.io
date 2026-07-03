---
title: JWT 解析器
---

# JWT 在线解析与验签

仿 jwt.io 的双栏布局:左边粘贴 JWT（支持 `Bearer ` 前缀,三段按 Header/Payload/Signature 彩色高亮）,右边实时解码。时间类 claims（`exp` / `nbf` / `iat` / `auth_time`）自动转本地时间并判断有效性;还可在右下方**验证签名**——`HS256/384/512` 填共享密钥,`RS/PS/ES` 系列填 PEM 公钥,验证结果实时显示。所有运算在浏览器本地完成,token 与密钥不会上传。

<ClientOnly>
  <JwtDecoder />
</ClientOnly>

::: tip 试一试
页面预填了 jwt.io 的经典示例(HS256)。在右下 Secret 框填入 `your-256-bit-secret`,即可看到 <strong>✔ 签名有效</strong>。
:::

## 关于 JWT

JWT（JSON Web Token,RFC 7519）由三段 Base64URL 编码的内容组成,用 `.` 分隔：

```
Header.Payload.Signature
```

- **Header**：声明签名算法（`alg`）与类型（`typ`）,可能带密钥标识 `kid`
- **Payload**：claims 集合,如 `iss`（签发者）、`sub`（主体）、`aud`(受众)、`exp`(过期时间)
- **Signature**：对前两段的签名,防篡改

::: warning 解码 ≠ 验证
JWT 的前两段只是编码而非加密,任何人都能解码。只有在本工具中填入正确的密钥/公钥、看到 **✔ 签名有效** 后,其中的 claims 才可信;服务端还需进一步校验 `iss` / `aud` / `exp`。详见 [OIDC 核心概念](../oidc/concepts.md) 中的 ID Token 校验清单。
:::

<script setup>
import JwtDecoder from '@components/JwtDecoder.vue'
</script>
