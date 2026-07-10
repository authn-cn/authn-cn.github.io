---
title: 飞书 SAML SSO 助手
---

# 飞书 SAML SSO 助手

飞书作为 SP 接入企业 IdP 时**只支持 SAML 2.0,且不支持导入 IdP metadata**——只能在管理后台手工填字段。这个工具解决这一来一回的两个摩擦:

- **解析 IdP Metadata → 飞书字段**:粘贴 Okta / Entra ID / ADFS / IDaaS 导出的 metadata,自动提取要粘到飞书的 **Issuer、登录地址、登出地址、NameID 格式**,以及**去掉 `-----BEGIN/END-----` 头尾**的 Public Certificate(飞书那个框只收裸 base64)。
- **生成飞书 SP Metadata**:飞书不导出规范的 SP metadata 文件;把你在飞书 SSO 页复制到的 **ACS URL / SP Entity ID** 填进去,拼出一份标准 SP metadata(含证书与 NameIDFormat),上传给支持导入的 IdP。

<ClientOnly>
  <FeishuSamlHelper />
</ClientOnly>

::: warning 证书轮换的坑
飞书里 IdP 的签名证书是**写死**的。IdP 轮换签名证书后,必须回飞书**手动更新**这段证书,否则登录会毫无征兆地失败。全部运算在浏览器本地完成,metadata 与证书不会上传。
:::

关于飞书 SP SSO 的完整背景(为何仅 SAML、字段对应、与钉钉的差异),见 [国内平台 SSO 对接](../cn-sso/)。通用的 metadata 结构解析见 [SAML Metadata 解析器](./saml-metadata.md)。

<script setup>
import FeishuSamlHelper from '@components/FeishuSamlHelper.vue'
</script>
