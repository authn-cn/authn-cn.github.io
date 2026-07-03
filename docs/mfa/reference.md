---
title: otpauth URI 与参数参考
---

# otpauth URI 与参数参考

本页是 OTP 分发与参数的速查手册:`otpauth://` URI 格式、各参数默认值、二维码约定、验证器兼容性、Base32 编码规则,以及"码不对"的排错速查表。算法原理见 [HOTP / TOTP 算法详解](./totp.md)。

## otpauth:// URI 格式

验证器 App(Google Authenticator 等)通过一个 `otpauth://` URI 导入共享密钥。这是事实标准(由 Google Authenticator 定义并被广泛采用)。二维码里承载的就是这段 URI。

```
otpauth://TYPE/LABEL?secret=...&issuer=...&algorithm=...&digits=...&period=...&counter=...
```

各组成部分:

- **TYPE**:`totp` 或 `hotp`,决定移动因子类型。
- **LABEL**:标识账户的显示名,格式 `issuer:account`(如 `Example:alice@example.com`)。冒号前是发行方,冒号后是账户名。LABEL 需 URL 编码(冒号可写作 `%3A`,空格写作 `%20`)。
- **query 参数**:密钥及可选算法参数,见下表。

完整示例:

```
otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA1&digits=6&period=30
```

HOTP 示例(注意用 `counter` 而非 `period`):

```
otpauth://hotp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&counter=0
```

## 参数表与默认值

| 参数 | 适用类型 | 是否必需 | 允许值 | 默认值 | 说明 |
|------|----------|----------|--------|--------|------|
| `secret` | totp/hotp | **必需** | Base32 字符串 | 无 | 共享密钥,RFC 4648 Base32,大写、去填充 |
| `issuer` | totp/hotp | 强烈推荐 | 字符串 | 无 | 发行方,建议同时出现在 LABEL 前缀与此参数,且两者一致 |
| `algorithm` | totp/hotp | 可选 | `SHA1` / `SHA256` / `SHA512` | `SHA1` | HMAC 哈希算法 |
| `digits` | totp/hotp | 可选 | `6` / `8` | `6` | 生成码位数 |
| `period` | **totp** | 可选 | 正整数(秒)| `30` | 时间步长,仅 TOTP 使用 |
| `counter` | **hotp** | HOTP 必需 | 非负整数 | 无 | 初始计数器,仅 HOTP 使用 |

::: tip issuer 的两处一致
最佳实践是 `issuer` 既作为 LABEL 前缀(`Example:alice@...`)又作为独立 `issuer=Example` 参数,且二者字符串一致。这样即使某个 App 只读其中一处,也能正确显示发行方,避免同名账户混淆。
:::

## 二维码承载约定

- 把完整 `otpauth://` URI 作为二维码内容(纯文本)编码,用户用验证器 App 扫码即导入。
- 纠错级别通常选 **M**(中);URI 较长且含长密钥时可用 **L** 以缩小图形。
- 二维码只在绑定阶段展示,**不应持久化或缓存**,展示后应从内存清除;避免出现在日志、截图、CDN 缓存中。
- 应同时提供密钥文本(Base32)供无法扫码时手动录入。

## 主流验证器 App 兼容性

| App | 非默认 algorithm(SHA256/512)| digits=8 | 自定义 period | 备注 |
|-----|------|------|------|------|
| Google Authenticator | 历史版本常忽略,按 SHA1 处理 | 支持不稳定 | 支持不稳定 | 兼容性最保守,建议只用默认 |
| Microsoft Authenticator | 部分支持 | 部分支持 | 部分支持 | 以默认组合最稳妥 |
| Authy | 支持较好 | 支持 | 支持 | 参数容忍度较高 |
| FreeOTP / andOTP | 支持较好 | 支持 | 支持 | 开源实现,参数完整 |
| 1Password | 支持较好 | 支持 | 支持 | — |

::: danger 互操作首要原则
若无强安全需求,坚持 **SHA1 / 6 位 / 30 秒** 默认组合。很多 App(尤其早期 Google Authenticator)会**静默忽略** `algorithm`、`digits`、`period` 参数并一律按默认计算——此时它生成的码与你服务端按 SHA256/8 位计算的码永远对不上,且没有任何报错,极难排查。
:::

## Base32 编码说明(RFC 4648)

`secret` 使用 Base32 编码,约定如下:

- **字母表**:`A–Z` + `2–7`,共 32 个字符(不含 `0`、`1`、`8`、`9`,避免与字母混淆)。
- **大写**:验证器展示与录入均用大写;解码时应大小写不敏感处理。
- **无填充**:otpauth 场景**去掉尾部 `=` 填充**。
- **编码单位**:每 5 bit 映射一个字符,故 8 字符编码 5 字节。
- **建议长度**:密钥至少 160 bit(20 字节)= 32 个 Base32 字符。

```
字节 (5)  : 0x48 0x65 0x6C 0x6C 0x6F
Base32    : JBSWY3DP
```

## 参数默认值一览

| 项 | 默认 |
|----|------|
| TYPE | totp |
| algorithm | SHA1 |
| digits | 6 |
| period | 30 秒 |
| T0(计时起点)| 0(Unix 纪元)|
| 验证容错窗口 | ±1 步(约 ±30 秒)|
| secret 编码 | Base32,大写,无填充 |
| secret 长度 | ≥160 bit(20 字节)|

## 排错速查表:码总是不对

按出现频率从高到低排查:

| 症状 / 原因 | 判断方法 | 解决 |
|------|----------|------|
| **客户端时钟偏移** | 最常见。用户设备时间不准,或时区/自动同步关闭 | 开启设备"自动设置时间";服务端可临时放宽 window 定位偏差量 |
| **服务端时钟偏移** | 服务端未同步 NTP | 部署 NTP;用标准测试向量自检 |
| **密钥编码错误** | 存/取密钥时把 Base32 当原始字节,或反之 | 明确密钥在数据库、URI、HMAC 输入三处的表示;HMAC 输入必须是**解码后的原始字节** |
| **Base32 填充/大小写** | secret 含 `=` 或小写导致 App 解析异常 | 去填充、转大写后再写入 URI |
| **算法/位数不符** | 服务端用 SHA256 或 8 位,但 App 忽略参数按 SHA1/6 位算 | 统一为默认 SHA1/6 位;或改用参数容忍度高的 App |
| **period 不一致** | 服务端 period 与 URI 不符,或 App 忽略了自定义 period | 统一用 30 秒 |
| **计数器失步(HOTP)** | 用户误触令牌使 counter 超前 | 服务端设前向查找窗口,命中后同步 counter |
| **未做容错窗口** | 只比对当前时间片,跨窗口边界即失败 | 验证时检查 ±1 步 |
| **重放拦截误判** | 防重放逻辑把合法首次使用当重放拒绝 | 检查"上次使用时间片"记录逻辑 |
| **counter/period 用错字段** | HOTP 误填 period 或 TOTP 误填 counter | 按 TYPE 使用对应参数 |

::: tip 自检建议
用 RFC 4226 附录 D 的 HOTP 测试向量(密钥 `"12345678901234567890"`,计数器 0 → `755224`)和 RFC 6238 附录 B 的 TOTP 测试向量校验服务端实现,可快速定位是算法实现问题还是配置/时钟问题。
:::

返回:[MFA 概述](./README.md) · [算法详解](./totp.md)
