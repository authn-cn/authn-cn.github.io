---
title: SAML 编解码
---

# SAML 在线编解码

**解码**：粘贴 `SAMLRequest` / `SAMLResponse` 参数值、完整的 Redirect URL,或原始 XML,工具会自动识别编码方式（Redirect Binding 的 `deflate + base64 + urlencode`,或 POST Binding 的纯 `base64`）并格式化输出 XML。

**生成**：填写 SP 侧关键参数,生成一个规范的 `AuthnRequest`,并给出 Redirect Binding 编码值与完整跳转 URL,方便对接联调。

<ClientOnly>
  <SamlTool />
</ClientOnly>

## 两种 Binding 的编码方式

| Binding | 传输位置 | 编码 |
|---------|----------|------|
| HTTP-Redirect | URL 查询参数 `SAMLRequest` | XML → raw deflate 压缩 → Base64 → URL 编码 |
| HTTP-POST | 表单字段 `SAMLRequest` / `SAMLResponse` | XML → Base64（无压缩） |

详细流程说明见 [SAML 典型流程](../saml/flows.md)。

<script setup>
import SamlTool from '@components/SamlTool.vue'
</script>
