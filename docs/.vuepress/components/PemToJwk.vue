<template>
  <div class="authn-tool">
    <label class="authn-label">PEM 密钥（公钥 SPKI 或私钥 PKCS#8）</label>
    <textarea v-model="input" class="authn-textarea" rows="8" spellcheck="false"
      placeholder="-----BEGIN PUBLIC KEY-----&#10;MIIB...&#10;-----END PUBLIC KEY-----"
      @input="convert"></textarea>
    <label class="authn-label">导出私钥字段(d、p、q…)</label>
    <label class="authn-switch"><input type="checkbox" v-model="exportPrivate" @change="convert" /> 若输入含私钥,一并输出私钥参数</label>
    <p v-if="error" class="authn-error">{{ error }}</p>

    <div v-if="result">
      <table class="authn-table"><tbody>
        <tr><td><strong>kty</strong></td><td>{{ result.jwk.kty }}<span v-if="result.jwk.crv">（{{ result.jwk.crv }}）</span></td></tr>
        <tr><td><strong>算法</strong></td><td>{{ result.algLabel }}</td></tr>
        <tr><td><strong>输入类型</strong></td><td>{{ result.kind }}</td></tr>
        <tr><td><strong>kid（RFC 7638 指纹)</strong></td><td style="word-break:break-all">{{ result.thumbprint }}</td></tr>
      </tbody></table>
      <label class="authn-label">JWK（JSON）</label>
      <pre class="authn-pre">{{ result.json }}</pre>
      <button class="authn-btn" @click="copy">复制 JWK</button>
    </div>
    <p class="authn-note">
      WebCrypto 仅支持 SPKI 公钥（<code>BEGIN PUBLIC KEY</code>)与 PKCS#8 私钥（<code>BEGIN PRIVATE KEY</code>)。
      老式 <code>BEGIN RSA PRIVATE KEY</code>（PKCS#1）/ <code>BEGIN EC PRIVATE KEY</code>（SEC1)请先转 PKCS#8：
      <code>openssl pkcs8 -topk8 -nocrypt -in key.pem</code>。密钥在浏览器本地转换,不上传。反向见 <a href="./jwk-convert.html">JWK → PEM</a>。
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { pemToBytes } from './x509.js'

const input = ref('')
const exportPrivate = ref(false)
const error = ref('')
const result = ref(null)

const ALGS = [
  { params: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, label: 'RSA（RSASSA-PKCS1-v1_5）' },
  { params: { name: 'ECDSA', namedCurve: 'P-256' }, label: 'EC（P-256 / ES256)' },
  { params: { name: 'ECDSA', namedCurve: 'P-384' }, label: 'EC（P-384 / ES384)' },
  { params: { name: 'ECDSA', namedCurve: 'P-521' }, label: 'EC（P-521 / ES512)' },
]

function b64url(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
async function thumbprint(jwk) {
  const members = jwk.kty === 'RSA'
    ? { e: jwk.e, kty: jwk.kty, n: jwk.n }
    : { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y }
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(members)))
  return b64url(new Uint8Array(d))
}

async function importAny(format, bytes, usages) {
  let lastErr
  for (const a of ALGS) {
    try {
      const key = await crypto.subtle.importKey(format, bytes, a.params, true, usages)
      return { key, label: a.label }
    } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('无法识别的密钥')
}

async function convert() {
  error.value = ''
  result.value = null
  const raw = input.value.trim()
  if (!raw) return

  const isPrivate = /BEGIN[^-]*PRIVATE KEY/.test(raw)
  if (/BEGIN RSA PRIVATE KEY|BEGIN EC PRIVATE KEY/.test(raw)) {
    error.value = '检测到 PKCS#1 / SEC1 私钥,WebCrypto 不支持。请先用 openssl 转成 PKCS#8(见下方提示)。'
    return
  }
  let bytes
  try { bytes = pemToBytes(raw) } catch { error.value = '无法解码 PEM / base64。'; return }

  try {
    const format = isPrivate ? 'pkcs8' : 'spki'
    const usages = isPrivate ? ['sign'] : ['verify']
    const { key, label } = await importAny(format, bytes, usages)
    let jwk = await crypto.subtle.exportKey('jwk', key)

    // 默认只输出公钥参数;可选保留私钥字段
    if (!exportPrivate.value) {
      jwk = jwk.kty === 'RSA'
        ? { kty: 'RSA', n: jwk.n, e: jwk.e, alg: jwk.alg, use: 'sig' }
        : { kty: 'EC', crv: jwk.crv, x: jwk.x, y: jwk.y, use: 'sig' }
    }
    const tp = await thumbprint(jwk)
    jwk.kid = tp
    result.value = {
      jwk,
      json: JSON.stringify(jwk, null, 2),
      algLabel: label,
      kind: isPrivate ? 'PKCS#8 私钥' : 'SPKI 公钥',
      thumbprint: tp,
    }
  } catch (e) {
    error.value = '导入失败:' + (e.message || String(e)) + '（确认是 SPKI 公钥或 PKCS#8 私钥,且为 RSA / EC)'
  }
}

function copy() {
  if (result.value) navigator.clipboard?.writeText(result.value.json)
}
</script>

<style scoped>
.authn-switch { display: flex; align-items: center; gap: 0.4rem; font-weight: 400; cursor: pointer; }
.authn-switch input { width: auto; }
</style>
<style scoped src="./tool-style.css"></style>
