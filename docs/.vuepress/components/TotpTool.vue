<template>
  <div class="authn-tool">
    <div class="authn-row">
      <div class="authn-field">
        <label class="authn-label">Secret（Base32）</label>
        <input v-model="secret" class="authn-input" spellcheck="false" @input="onChange" />
      </div>
      <div class="authn-field" style="display:flex;align-items:flex-end">
        <button class="authn-btn" @click="genSecret">随机生成</button>
      </div>
    </div>
    <div class="authn-row">
      <div class="authn-field">
        <label class="authn-label">Issuer</label>
        <input v-model="issuer" class="authn-input" @input="onChange" />
      </div>
      <div class="authn-field">
        <label class="authn-label">账户</label>
        <input v-model="account" class="authn-input" @input="onChange" />
      </div>
    </div>
    <div class="authn-row">
      <div class="authn-field">
        <label class="authn-label">period(秒)</label>
        <input v-model.number="period" type="number" class="authn-input" @input="onChange" />
      </div>
      <div class="authn-field">
        <label class="authn-label">digits</label>
        <select v-model.number="digits" class="authn-select" @change="onChange"><option>6</option><option>8</option></select>
      </div>
      <div class="authn-field">
        <label class="authn-label">algorithm</label>
        <select v-model="algorithm" class="authn-select" @change="onChange"><option>SHA1</option><option>SHA256</option><option>SHA512</option></select>
      </div>
    </div>

    <p v-if="error" class="authn-error">{{ error }}</p>

    <template v-if="!error && secret">
      <div class="totp-code">
        <div class="totp-digits">{{ code }}</div>
        <div class="totp-count">{{ remaining }}s</div>
      </div>

      <label class="authn-label">otpauth:// URI</label>
      <pre class="authn-pre">{{ otpauth }}</pre>

      <img v-if="qr" :src="qr" alt="otpauth 二维码" class="totp-qr" />
      <p class="authn-note">用 Google Authenticator / Authy 等扫码添加。密钥与验证码均在浏览器本地计算,不上传。</p>

      <label class="authn-label">校验一个验证码</label>
      <div class="authn-row">
        <div class="authn-field">
          <input v-model="check" class="authn-input" placeholder="输入 6/8 位验证码" @input="doCheck" />
        </div>
        <div class="authn-field" style="display:flex;align-items:center">
          <span v-if="checkResult === 'ok'" class="authn-ok">✔ 有效(±1 时间窗)</span>
          <span v-else-if="checkResult === 'bad'" class="authn-bad">✗ 无效</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const secret = ref('')
const issuer = ref('Authn.tech')
const account = ref('alice@example.com')
const period = ref(30)
const digits = ref(6)
const algorithm = ref('SHA1')
const code = ref('------')
const remaining = ref(0)
const otpauth = ref('')
const qr = ref('')
const error = ref('')
const check = ref('')
const checkResult = ref('')
let timer = null

function b32encode(bytes) {
  let bits = 0, value = 0, out = ''
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}
function b32decode(s) {
  const clean = s.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  let bits = 0, value = 0
  const out = []
  for (const ch of clean) {
    const idx = B32.indexOf(ch)
    if (idx === -1) throw new Error('secret 含非 Base32 字符')
    value = (value << 5) | idx; bits += 5
    if (bits >= 8) { bits -= 8; out.push((value >>> bits) & 0xff) }
  }
  return new Uint8Array(out)
}
async function hotp(key, counter, dig, alg) {
  const hash = { SHA1: 'SHA-1', SHA256: 'SHA-256', SHA512: 'SHA-512' }[alg] || 'SHA-1'
  const buf = new ArrayBuffer(8)
  const dv = new DataView(buf)
  dv.setUint32(0, Math.floor(counter / 0x100000000))
  dv.setUint32(4, counter >>> 0)
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', k, buf))
  const off = mac[mac.length - 1] & 0x0f
  const bin = ((mac[off] & 0x7f) << 24) | ((mac[off + 1] & 0xff) << 16) | ((mac[off + 2] & 0xff) << 8) | (mac[off + 3] & 0xff)
  return (bin % 10 ** dig).toString().padStart(dig, '0')
}

function genSecret() {
  secret.value = b32encode(crypto.getRandomValues(new Uint8Array(20)))
  onChange()
}
async function onChange() {
  error.value = ''
  checkResult.value = ''
  const p = Math.max(1, period.value || 30)
  try {
    b32decode(secret.value) // 验证
    const label = encodeURIComponent(`${issuer.value}:${account.value}`)
    otpauth.value = `otpauth://totp/${label}?secret=${secret.value.replace(/\s/g, '')}&issuer=${encodeURIComponent(issuer.value)}&algorithm=${algorithm.value}&digits=${digits.value}&period=${p}`
    const QRCode = (await import('qrcode')).default
    qr.value = await QRCode.toDataURL(otpauth.value, { margin: 1, width: 180 })
    await tick()
  } catch (e) {
    error.value = e.message || String(e)
    qr.value = ''
  }
}
async function tick() {
  if (error.value || !secret.value) return
  try {
    const p = Math.max(1, period.value || 30)
    const now = Math.floor(Date.now() / 1000)
    code.value = await hotp(b32decode(secret.value), Math.floor(now / p), digits.value, algorithm.value)
    remaining.value = p - (now % p)
  } catch { /* ignore */ }
}
async function doCheck() {
  checkResult.value = ''
  if (!check.value) return
  try {
    const p = Math.max(1, period.value || 30)
    const now = Math.floor(Date.now() / 1000)
    const step = Math.floor(now / p)
    const key = b32decode(secret.value)
    for (let w = -1; w <= 1; w++) {
      if ((await hotp(key, step + w, digits.value, algorithm.value)) === check.value.trim()) {
        checkResult.value = 'ok'; return
      }
    }
    checkResult.value = 'bad'
  } catch { checkResult.value = 'bad' }
}

onMounted(() => {
  genSecret()
  timer = setInterval(tick, 1000)
})
onUnmounted(() => timer && clearInterval(timer))
</script>

<style scoped>
.totp-code { display: flex; align-items: baseline; gap: 1rem; margin: 0.6rem 0; }
.totp-digits { font-family: ui-monospace, monospace; font-size: 2.2rem; letter-spacing: 0.3rem; color: #3eaf7c; font-weight: 700; }
.totp-count { font-size: 1rem; opacity: 0.7; }
.totp-qr { border: 1px solid var(--vp-c-border, #eee); border-radius: 8px; background: #fff; padding: 6px; }
</style>
<style scoped src="./tool-style.css"></style>
