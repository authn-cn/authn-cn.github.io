---
title: HOTP / TOTP 算法详解
---

# HOTP / TOTP 算法详解

本页拆解 HOTP(RFC 4226)与 TOTP(RFC 6238)的计算过程,给出动态截断的位运算细节,并附可运行的 JavaScript 参考实现。建议先阅读 [概述](./README.md)。

## 共享密钥(shared secret)

OTP 是**对称**方案:服务端与用户设备持有同一把密钥 K(shared secret,共享密钥)。密钥是原始字节序列,但为便于人眼录入和二维码承载,通常用 **Base32**(RFC 4648)编码为大写字母 `A–Z` 与数字 `2–7`。

```
原始密钥字节: 0x48 0x65 0x6C 0x6C 0x6F ...
Base32 编码:  JBSWY3DPEHPK3PXP   （录入验证器时看到的字符串）
```

::: tip
选 Base32 而非 Base64,是因为 Base32 不含易混淆字符、大小写不敏感、适合手动输入。密钥长度建议至少 160 bit(20 字节,对应 SHA-1 的分组),即 32 个 Base32 字符。见 [参考页的 Base32 说明](./reference.md)。
:::

服务端**必须密文存储**共享密钥(如用 KMS/信封加密),因为它一旦泄露,攻击者即可离线克隆用户的所有 OTP。

## HOTP 算法分步(RFC 4226)

HOTP 的输入是密钥 K 和一个 8 字节计数器 C,输出是 `digits` 位十进制码。

### 步骤

1. **构造计数器缓冲区**:把计数器 C 编码为 **8 字节大端(big-endian)** 序列。
2. **计算 HMAC**:`HS = HMAC-SHA1(K, C)`,得到 20 字节摘要。
3. **动态截断(dynamic truncation)**:从 20 字节里按最后一字节的低 4 位选出 4 字节。
4. **取模**:把这 4 字节当成 31 位整数,对 `10^digits` 取模,左侧补零到 `digits` 位。

```
HOTP(K, C) = Truncate(HMAC-SHA1(K, C)) mod 10^digits
```

### 动态截断的位运算细节

设 `HS` 为 20 字节摘要,索引 0–19:

1. 取最后一字节 `HS[19]` 的**低 4 位**作为偏移量:`offset = HS[19] & 0x0F`,范围 0–15。
2. 从 `offset` 起取 4 字节,拼成 32 位整数,并**清除最高位**(`& 0x7F` 用于第一字节),得到 31 位无符号数,避免符号位歧义:

```
binCode = ((HS[offset]   & 0x7F) << 24)
        | ((HS[offset+1] & 0xFF) << 16)
        | ((HS[offset+2] & 0xFF) <<  8)
        |  (HS[offset+3] & 0xFF)
```

3. 取模得到最终码:`otp = binCode mod 10^digits`,如 digits=6 则 `mod 1000000`。

::: tip 示例（来自 RFC 4226 附录 D）
密钥 K = ASCII `"12345678901234567890"`,计数器 C = 0：
`HMAC-SHA1` 摘要末字节低 4 位给出 offset = 6,截断得 31 位整数,`mod 10^6 = 755224`。
连续计数器 0..9 的 6 位 HOTP 依次为:`755224, 287082, 359152, 969429, 338314, 254676, 287922, 162583, 399871, 520489`。这组值是校验实现是否正确的标准测试向量。
:::

## TOTP 算法(RFC 6238)

TOTP 就是把 HOTP 的计数器换成**时间步长** T:

```
T = floor((currentUnixTime - T0) / period)
TOTP(K) = HOTP(K, T)
```

参数默认值:

- `T0`:计时起点,默认 **0**(Unix 纪元)。
- `period`(时间步长,又称 X):默认 **30** 秒。
- `digits`:默认 **6**。
- 哈希算法:默认 **SHA-1**。

也就是说,把当前 Unix 时间戳(秒)减去 T0,整除 period,得到当前处于第几个时间片,把这个片编号当作 HOTP 的计数器计算。同一个 30 秒窗口内 T 不变,生成的码也不变;跨过窗口边界后码自动刷新。

## 验证侧的时间窗口容错

用户设备时钟与服务端时钟可能存在偏移,且用户输入需要时间。验证时**不能只比对当前时间片**,而应检查相邻时间片:

1. 计算服务端当前时间片 `T`。
2. 在 `[T - window, T + window]` 范围内(通常 `window = 1`,即 ±1 步 = ±30 秒)逐一计算 TOTP 与用户输入比对。
3. 任一命中即通过;全部不中则失败。

::: warning
容错窗口是**安全与可用性的权衡**:窗口越大越宽容,但也扩大了攻击者的重放窗口。推荐 `window = 1`(总有效跨度约 90 秒)。切勿为"减少客服工单"把窗口调到很大。更好的做法是引导用户校准设备时间。
:::

比对时应使用**常量时间比较**(constant-time compare),避免通过响应时间旁路泄露信息。

## 可选参数

- **哈希算法**:SHA-1 / SHA-256 / SHA-512 均可(TOTP 规范允许)。注意 HMAC 输出长度不同(20/32/64 字节),动态截断逻辑不变(仍用末字节低 4 位取 offset)。
- **digits**:通常 6,部分高安全场景用 8。
- 详见 [参考页的参数表](./reference.md)。

::: danger 兼容性提醒
虽然规范支持 SHA-256/512 与 8 位,但**多数主流验证器 App 只可靠支持默认组合 SHA-1 / 6 位 / 30 秒**。若无强需求,坚持默认组合以保证互操作。
:::

## 安全注意事项

- **密钥熵**:随机生成 ≥160 bit 的密钥,用 CSPRNG(密码学安全随机数),绝不复用或用可预测值。
- **防重放**:记录用户上次成功使用的时间片,拒绝同一时间片(及更早)的码再次使用,防止 30 秒内同一码被重放。
- **限流(rate limiting)**:6 位码空间仅 100 万,必须限制尝试次数(如失败 N 次锁定/退避),否则可被暴力枚举。
- **时钟同步**:服务端用 NTP 保持时钟准确;客户端时钟偏移是首要故障原因。
- **绑定期防护**:导入密钥后要求用户先输入一次当前码确认,再启用 MFA。
- **传输与存储**:密钥仅在绑定时下发一次,服务端加密存储,前端不回显。

## 备用码(backup / recovery codes)

用户可能丢失验证器设备。启用 TOTP 时应一次性生成一组**一次性备用码**(如 10 个高熵随机码),供设备丢失时登录:

- 每个备用码**只能用一次**,用后即作废。
- 服务端应像密码一样**哈希存储**备用码(如 bcrypt/argon2),不明文保存。
- 提示用户离线保存(打印/密码管理器),并支持重新生成(旧码全部失效)。

## 完整 TOTP 参考实现(JavaScript / Node.js)

```js
const crypto = require('crypto');

// Base32 (RFC 4648) 解码为 Buffer；忽略填充与大小写
function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new Error('非法 Base32 字符: ' + ch);
    value = (value << 5) | idx;   // 每字符携带 5 bit
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// HOTP：K 为密钥 Buffer，counter 为整数计数器
function hotp(key, counter, { digits = 6, algorithm = 'sha1' } = {}) {
  // 1. 计数器编码为 8 字节大端
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  // 2. HMAC
  const hs = crypto.createHmac(algorithm, key).update(buf).digest();

  // 3. 动态截断
  const offset = hs[hs.length - 1] & 0x0f;
  const binCode =
      ((hs[offset]     & 0x7f) << 24) |
      ((hs[offset + 1] & 0xff) << 16) |
      ((hs[offset + 2] & 0xff) << 8)  |
       (hs[offset + 3] & 0xff);

  // 4. 取模并左补零
  const otp = binCode % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}

// TOTP：基于时间步长的 HOTP
function totp(base32Secret, {
  time = Date.now(),   // 毫秒
  t0 = 0, period = 30, digits = 6, algorithm = 'sha1',
} = {}) {
  const key = base32Decode(base32Secret);
  const counter = Math.floor((Math.floor(time / 1000) - t0) / period);
  return hotp(key, counter, { digits, algorithm });
}

// 验证：允许 ±window 个时间步的容错，命中返回 true
function verifyTotp(token, base32Secret, {
  time = Date.now(), t0 = 0, period = 30,
  digits = 6, algorithm = 'sha1', window = 1,
} = {}) {
  const key = base32Decode(base32Secret);
  const current = Math.floor((Math.floor(time / 1000) - t0) / period);
  for (let w = -window; w <= window; w++) {
    const candidate = hotp(key, current + w, { digits, algorithm });
    // 常量时间比较，避免计时旁路
    if (candidate.length === token.length &&
        crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(token))) {
      return true;
    }
  }
  return false;
}

// 示例
const secret = 'JBSWY3DPEHPK3PXP';
console.log(totp(secret));                 // 当前 6 位码
console.log(verifyTotp(totp(secret), secret)); // true
```

::: tip
生产环境不必自己造轮子:Node 生态可用 `otplib`、`speakeasy` 等成熟库。上面的实现用于理解算法内部机制,以及做测试向量校验。
:::

下一步:阅读 [otpauth URI 与参数参考](./reference.md) 了解如何把密钥打包成二维码分发给验证器 App。
