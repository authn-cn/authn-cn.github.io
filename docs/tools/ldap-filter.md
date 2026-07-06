---
title: LDAP 过滤器构建器
---

# LDAP 搜索过滤器构建器

可视化拼装符合 [RFC 4515](https://datatracker.ietf.org/doc/html/rfc4515) 的 LDAP 搜索过滤器:选属性、运算符、值,支持 AND / OR 组合与 NOT 取反,值中的特殊字符 `* ( ) \` 会自动转义。生成的过滤器可一键复制,或直接对本站的 [Mock LDAP](../mock/ldap.md) 示例目录测试搜索结果。

<ClientOnly>
  <LdapFilterBuilder />
</ClientOnly>

::: tip 过滤器速记
- 等值:`(uid=alice)`;存在:`(mail=*)`;子串:`(cn=*Zh*)`
- 与 / 或 / 非:`(&(A)(B))`、`(|(A)(B))`、`(!(A))`
- 常见组合:`(&(objectClass=person)(memberOf=cn=admins,ou=groups,dc=example,dc=com))`
:::

完整语法与常见属性见 [LDAP 参考](../ldap/reference.md)。

<script setup>
import LdapFilterBuilder from '@components/LdapFilterBuilder.vue'
</script>
