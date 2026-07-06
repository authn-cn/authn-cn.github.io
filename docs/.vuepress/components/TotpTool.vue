<template>
  <div class="authn-tool">
    <!-- ============ 生成 / 计算 ============ -->
    <div class="authn-row">
      <div class="authn-field">
        <label class="authn-label">Secret（Base32）</label>
        <input v-model="secret" class="authn-input" spellcheck="false" @input="onChange" />
      </div>
      <div class="authn-field" style="display:flex;align-items:flex-end;gap:.5rem">
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

    <!-- ============ 导入:扫码 / URI ============ -->
    <div class="totp-import">
      <div class="authn-field">
        <label class="authn-label">从二维码图片导入</label>
        <input type="file" accept="image/*" class="authn-input" @change="onQrFile" />
      </div>
      <div class="authn-field" style="flex:2">
        <label class="authn-label">或粘贴 otpauth:// URI</label>
        <div style="display:flex;gap:.5rem">
          <input v-model="importUri" class="authn-input" spellcheck="false" placeholder="otpauth://totp/Issuer:acct?secret=..." />
          <button class="authn-btn" @click="importFromUri">导入</button>
        </div>
      </div>
    </div>
    <p v-if="importMsg" :class="importOk ? 'authn-ok' : 'authn-bad'">{{ importMsg }}</p>

    <p v-if="error" class="authn-error">{{ error }}</p>

    <template v-if="!error && secret">
      <div class="totp-code">
        <div class="totp-digits">{{ code }}</div>
        <div class="totp-count">{{ remaining }}s</div>
        <button class="authn-btn totp-copy" @click="copyText(code)">复制</button>
      </div>

      <label class="authn-label">otpauth:// URI</label>
      <pre class="authn-pre">{{ otpauth }}</pre>

      <img v-if="qr" :src="qr" alt="otpauth 二维码" class="totp-qr" />
      <p class="authn-note">用 Google Authenticator / Authy 等扫码添加。密钥与验证码均在浏览器本地计算,不上传。</p>

      <!-- ============ 收藏 / 保存 ============ -->
      <div class="totp-actions">
        <button class="authn-btn" @click="pinToUrl">🔖 放进地址栏(Ctrl+D 收藏)</button>
        <button class="authn-btn" @click="copyText(shareUrl)">复制收藏链接</button>
        <button class="authn-btn" @click="saveCurrent">➕ 保存到本地列表</button>
      </div>
      <p class="authn-note totp-warn">
        ⚠ 收藏链接会把 secret 明文放进 URL / 书签 / 浏览器本地存储,<strong>仅用于测试密钥</strong>,勿存放生产密钥。
      </p>

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

    <!-- ============ 已保存的 TOTP 列表 ============ -->
    <template v-if="saved.length">
      <label class="authn-label" style="margin-top:1.2rem">已保存的 TOTP(浏览器本地)</label>
      <table class="totp-list">
        <tbody>
          <tr v-for="s in saved" :key="s.id">
            <td class="totp-list-name">
              <div><strong>{{ s.issuer || '(无 issuer)' }}</strong></div>
              <div class="totp-list-acct">{{ s.account }}</div>
            </td>
            <td class="totp-list-code">{{ savedCodes[s.id]?.code || '------' }}</td>
            <td class="totp-list-rem">{{ savedCodes[s.id]?.remaining ?? '' }}<span v-if="savedCodes[s.id]">s</span></td>
            <td class="totp-list-btns">
              <button class="authn-btn sm" @click="copyText(savedCodes[s.id]?.code)">复制</button>
              <button class="authn-btn sm" @click="loadSaved(s)">编辑</button>
              <button class="authn-btn sm danger" @click="removeSaved(s.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="authn-note">列表保存在本机 localStorage,可跨刷新保留。“编辑”会把该条载入上方编辑区。</p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const STORE_KEY = 'authn_totp_saved'
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
const importUri = ref('')
const importMsg = ref('')
const importOk = ref(false)
const saved = ref([])
const savedCodes = ref({})
let timer = null

const shareUrl = computed(() => {
  if (typeof location === 'undefined' || !otpauth.value) return ''
  return location.origin + location.pathname + '#t=' + encodeURIComponent(otpauth.value)
})

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
  const p = Math.max(1, period.value || 30)
  const now = Math.floor(Date.now() / 1000)
  if (!error.value && secret.value) {
    try {
      code.value = await hotp(b32decode(secret.value), Math.floor(now / p), digits.value, algorithm.value)
      remaining.value = p - (now % p)
    } catch { /* ignore */ }
  }
  // 已保存列表的实时码
  for (const s of saved.value) {
    try {
      const sp = Math.max(1, s.period || 30)
      savedCodes.value[s.id] = {
        code: await hotp(b32decode(s.secret), Math.floor(now / sp), s.digits, s.algorithm),
        remaining: sp - (now % sp),
      }
    } catch { savedCodes.value[s.id] = { code: '错误', remaining: 0 } }
  }
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

// ---------- 导入:otpauth URI ----------
function parseOtpauth(uri) {
  const u = (uri || '').trim()
  if (!/^otpauth:\/\/totp\//i.test(u)) throw new Error('不是 otpauth://totp URI')
  const url = new URL(u)
  const params = url.searchParams
  const sec = params.get('secret')
  if (!sec) throw new Error('URI 缺少 secret')
  const label = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
  let iss = params.get('issuer') || ''
  let acct = label
  if (label.includes(':')) {
    const i = label.indexOf(':')
    if (!iss) iss = label.slice(0, i)
    acct = label.slice(i + 1)
  }
  return {
    secret: sec.replace(/\s/g, ''),
    issuer: iss,
    account: acct,
    period: Number(params.get('period')) || 30,
    digits: Number(params.get('digits')) || 6,
    algorithm: (params.get('algorithm') || 'SHA1').toUpperCase(),
  }
}
function applyParsed(o) {
  secret.value = o.secret
  issuer.value = o.issuer
  account.value = o.account
  period.value = o.period
  digits.value = [6, 8].includes(o.digits) ? o.digits : 6
  algorithm.value = ['SHA1', 'SHA256', 'SHA512'].includes(o.algorithm) ? o.algorithm : 'SHA1'
  onChange()
}
function importFromUri() {
  try {
    applyParsed(parseOtpauth(importUri.value))
    importOk.value = true; importMsg.value = '已导入 otpauth URI。'
  } catch (e) {
    importOk.value = false; importMsg.value = '导入失败:' + (e.message || e)
  }
}

// ---------- 导入:二维码图片 ----------
function fileToImageData(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objUrl = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(objUrl)
      resolve(data)
    }
    img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error('无法加载图片')) }
    img.src = objUrl
  })
}
async function onQrFile(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  importMsg.value = ''
  try {
    const imgData = await fileToImageData(file)
    const jsQR = (await import('jsqr')).default
    const result = jsQR(imgData.data, imgData.width, imgData.height)
    if (!result || !result.data) throw new Error('未识别到二维码')
    applyParsed(parseOtpauth(result.data))
    importOk.value = true; importMsg.value = '已从二维码导入。'
  } catch (err) {
    importOk.value = false
    importMsg.value = '扫码失败:' + (err.message || err)
  } finally {
    e.target.value = '' // 允许重复选同一文件
  }
}

// ---------- 收藏 / URL ----------
function pinToUrl() {
  if (!otpauth.value) return
  location.hash = 't=' + encodeURIComponent(otpauth.value)
}
function readHash() {
  if (typeof location === 'undefined') return false
  const m = /[#&]t=([^&]+)/.exec(location.hash)
  if (!m) return false
  try { applyParsed(parseOtpauth(decodeURIComponent(m[1]))); return true } catch { return false }
}

// ---------- 本地保存列表 ----------
function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    saved.value = raw ? JSON.parse(raw) : []
  } catch { saved.value = [] }
}
function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(saved.value)) } catch { /* 隐私模式等 */ }
}
function saveCurrent() {
  const entry = {
    id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.round(performance.now()),
    secret: secret.value.replace(/\s/g, ''),
    issuer: issuer.value,
    account: account.value,
    period: Math.max(1, period.value || 30),
    digits: digits.value,
    algorithm: algorithm.value,
  }
  // 去重:同 secret+issuer+account 视为同一条
  const dup = saved.value.find((s) => s.secret === entry.secret && s.issuer === entry.issuer && s.account === entry.account)
  if (dup) { importOk.value = true; importMsg.value = '该 TOTP 已在列表中。'; return }
  saved.value = [...saved.value, entry]
  persist()
  tick()
}
function removeSaved(id) {
  saved.value = saved.value.filter((s) => s.id !== id)
  delete savedCodes.value[id]
  persist()
}
function loadSaved(s) {
  applyParsed({ ...s })
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function copyText(t) {
  if (!t) return
  try { await navigator.clipboard.writeText(t) } catch { /* 剪贴板不可用 */ }
}

onMounted(() => {
  loadStore()
  if (!readHash()) genSecret()
  timer = setInterval(tick, 1000)
})
onUnmounted(() => timer && clearInterval(timer))
</script>

<style scoped>
.totp-code { display: flex; align-items: baseline; gap: 1rem; margin: 0.6rem 0; }
.totp-digits { font-family: ui-monospace, monospace; font-size: 2.2rem; letter-spacing: 0.3rem; color: #3eaf7c; font-weight: 700; }
.totp-count { font-size: 1rem; opacity: 0.7; }
.totp-copy { align-self: center; }
.totp-qr { border: 1px solid var(--vp-c-border, #eee); border-radius: 8px; background: #fff; padding: 6px; }
.totp-import { display: flex; gap: 1rem; flex-wrap: wrap; margin: 0.8rem 0 0.2rem; }
.totp-import .authn-field { flex: 1; min-width: 220px; }
.totp-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.8rem 0 0.3rem; }
.totp-warn { color: #a67c00; }
.totp-list { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.9rem; }
.totp-list td { padding: 0.5rem 0.5rem; border-top: 1px solid var(--vp-c-border, #eee); vertical-align: middle; }
.totp-list-name { line-height: 1.3; }
.totp-list-acct { font-size: 0.78rem; opacity: 0.7; word-break: break-all; }
.totp-list-code { font-family: ui-monospace, monospace; font-size: 1.3rem; letter-spacing: 0.15rem; color: #3eaf7c; font-weight: 700; white-space: nowrap; }
.totp-list-rem { font-size: 0.85rem; opacity: 0.7; white-space: nowrap; }
.totp-list-btns { text-align: right; white-space: nowrap; }
.authn-btn.sm { padding: 0.2rem 0.55rem; font-size: 0.78rem; margin-left: 0.3rem; }
.authn-btn.danger { color: #e53935; }
</style>
<style scoped src="./tool-style.css"></style>
