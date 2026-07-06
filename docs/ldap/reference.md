---
title: 参数与语法参考
---

# LDAP 参数与语法参考

## 搜索过滤器(RFC 4515)

| 形式 | 含义 | 示例 |
|------|------|------|
| `(attr=value)` | 相等 | `(uid=alice)` |
| `(attr=*)` | 属性存在(present) | `(mail=*)` |
| `(attr=a*b*c)` | 子串(`*` 通配) | `(cn=Al*)`、`(mail=*@example.com)` |
| `(attr>=value)` | 大于等于 | `(uidNumber>=1000)` |
| `(attr<=value)` | 小于等于 | `(uidNumber<=2000)` |
| `(attr~=value)` | 近似匹配 | `(cn~=alise)` |
| `(&(f1)(f2)…)` | 逻辑与 AND | `(&(objectClass=person)(uid=alice))` |
| `(\|(f1)(f2)…)` | 逻辑或 OR | `(\|(uid=alice)(uid=bob))` |
| `(!(f))` | 逻辑非 NOT | `(!(objectClass=computer))` |
| `(attr:rule:=value)` | 扩展匹配 | AD 位与:`(userAccountControl:1.2.840.113556.1.4.803:=2)` |

**值转义**:特殊字符必须转成 `\` + 两位十六进制——`*`→`\2a`、`(`→`\28`、`)`→`\29`、`\`→`\5c`、NUL→`\00`。[过滤器构建器](../tools/ldap-filter.md) 会自动转义。

## 常见属性

| 属性 | 含义 |
|------|------|
| `dc` | domainComponent(如 `dc=example,dc=com`) |
| `ou` | organizationalUnit(组织单元/容器) |
| `cn` | commonName(通用名) |
| `sn` / `givenName` | 姓 / 名 |
| `uid` | 用户 ID |
| `mail` | 邮箱 |
| `member` / `memberOf` | 组成员 DN / 用户所属组 |
| `objectClass` | 条目类型(多值) |
| `userPassword` | 口令(通常不可读) |
| `sAMAccountName` / `userPrincipalName` | AD 登录名 / UPN |

## 常见 objectClass

| objectClass | 用途 |
|-------------|------|
| `top` | 所有条目的抽象基类 |
| `domain` / `dcObject` | 域组件条目 |
| `organizationalUnit` | 容器 / OU |
| `person` → `organizationalPerson` → `inetOrgPerson` | 人员(逐级扩展属性) |
| `groupOfNames` / `groupOfUniqueNames` | 组(用 `member` 列成员) |
| `posixAccount` / `posixGroup` | Unix 账号/组(uidNumber 等) |

## LDAP URL(RFC 4516)

```
ldap://host:port/base?attributes?scope?filter
ldaps://ldap.example.com/ou=people,dc=example,dc=com?cn,mail?sub?(uid=alice)
```

`scope` 取 `base` / `one` / `sub`。

## 常见结果码

| 码 | 名称 | 含义 |
|----|------|------|
| 0 | success | 成功 |
| 32 | noSuchObject | base DN 不存在 |
| 49 | invalidCredentials | bind 失败(DN/密码错) |
| 34 | invalidDNSyntax | DN 语法错误 |
| 50 | insufficientAccessRights | 权限不足 |
| 4 | sizeLimitExceeded | 超过返回条数上限 |
| 19 | constraintViolation | 违反约束(如密码策略) |

## ldapsearch 速用

```bash
# 搜索(LDAPS + 服务账号)
ldapsearch -H ldaps://ldap.example.com -x \
  -D "cn=reader,ou=apps,dc=example,dc=com" -w '****' \
  -b "dc=example,dc=com" -s sub "(&(objectClass=person)(departmentNumber=eng))" cn mail

# 验证某用户密码(simple bind,能连上即密码正确)
ldapwhoami -H ldaps://ldap.example.com -x \
  -D "uid=alice,ou=people,dc=example,dc=com" -w '****'
```

想直接试:[过滤器构建器](../tools/ldap-filter.md) + [Mock LDAP](../mock/ldap.md)(示例目录 `dc=example,dc=com`)。
