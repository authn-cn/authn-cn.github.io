<template>
  <div class="authn-tool">
    <label class="authn-label">{{ t('inputLabel') }}</label>
    <textarea v-model="input" class="authn-textarea" rows="8" spellcheck="false"
      :placeholder="t('inputPlaceholder')"
      @input="convert"></textarea>
    <label class="authn-label">{{ t('exportPrivateLabel') }}</label>
    <label class="authn-switch"><input type="checkbox" v-model="exportPrivate" @change="convert" /> {{ t('exportPrivateHint') }}</label>
    <p v-if="error" class="authn-error">{{ error }}</p>

    <div v-if="result">
      <table class="authn-table"><tbody>
        <tr><td><strong>kty</strong></td><td>{{ result.jwk.kty }}<span v-if="result.jwk.crv">（{{ result.jwk.crv }}）</span></td></tr>
        <tr><td><strong>{{ t('algorithmLabel') }}</strong></td><td>{{ result.algLabel }}</td></tr>
        <tr><td><strong>{{ t('inputTypeLabel') }}</strong></td><td>{{ result.kind }}</td></tr>
        <tr><td><strong>{{ t('kidLabel') }}</strong></td><td style="word-break:break-all">{{ result.thumbprint }}</td></tr>
      </tbody></table>
      <label class="authn-label">{{ t('jwkLabel') }}</label>
      <pre class="authn-pre">{{ result.json }}</pre>
      <button class="authn-btn" @click="copy">{{ t('copyBtn') }}</button>
    </div>
    <p class="authn-note" v-html="t('note')"></p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { pemToBytes } from './x509.js'
import { useT } from './i18n.js'

const messages = {
  zh: {
    inputLabel: 'PEM 密钥（公钥 SPKI 或私钥 PKCS#8）',
    inputPlaceholder: '-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----',
    exportPrivateLabel: '导出私钥字段(d、p、q…)',
    exportPrivateHint: '若输入含私钥,一并输出私钥参数',
    algorithmLabel: '算法',
    inputTypeLabel: '输入类型',
    kidLabel: 'kid（RFC 7638 指纹)',
    jwkLabel: 'JWK（JSON）',
    copyBtn: '复制 JWK',
    note: 'WebCrypto 仅支持 SPKI 公钥（<code>BEGIN PUBLIC KEY</code>)与 PKCS#8 私钥（<code>BEGIN PRIVATE KEY</code>)。老式 <code>BEGIN RSA PRIVATE KEY</code>（PKCS#1）/ <code>BEGIN EC PRIVATE KEY</code>（SEC1)请先转 PKCS#8：<code>openssl pkcs8 -topk8 -nocrypt -in key.pem</code>。密钥在浏览器本地转换,不上传。反向见 <a href="./jwk-convert.html">JWK → PEM</a>。',
    labelRsa: 'RSA（RSASSA-PKCS1-v1_5）',
    labelEcP256: 'EC（P-256 / ES256)',
    labelEcP384: 'EC（P-384 / ES384)',
    labelEcP521: 'EC（P-521 / ES512)',
    unrecognizedKey: '无法识别的密钥',
    pkcs1Sec1Error: '检测到 PKCS#1 / SEC1 私钥,WebCrypto 不支持。请先用 openssl 转成 PKCS#8(见下方提示)。',
    pemDecodeError: '无法解码 PEM / base64。',
    kindPrivate: 'PKCS#8 私钥',
    kindPublic: 'SPKI 公钥',
    importFailPrefix: '导入失败:',
    importFailSuffix: '（确认是 SPKI 公钥或 PKCS#8 私钥,且为 RSA / EC)',
  },
  en: {
    inputLabel: 'PEM key (public SPKI or private PKCS#8)',
    inputPlaceholder: '-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----',
    exportPrivateLabel: 'Export private key fields (d, p, q, ...)',
    exportPrivateHint: 'If the input contains a private key, also output the private key parameters',
    algorithmLabel: 'Algorithm',
    inputTypeLabel: 'Input type',
    kidLabel: 'kid (RFC 7638 thumbprint)',
    jwkLabel: 'JWK (JSON)',
    copyBtn: 'Copy JWK',
    note: 'WebCrypto only supports SPKI public keys (<code>BEGIN PUBLIC KEY</code>) and PKCS#8 private keys (<code>BEGIN PRIVATE KEY</code>). Legacy <code>BEGIN RSA PRIVATE KEY</code> (PKCS#1) / <code>BEGIN EC PRIVATE KEY</code> (SEC1) keys must be converted to PKCS#8 first: <code>openssl pkcs8 -topk8 -nocrypt -in key.pem</code>. Keys are converted locally in your browser and never uploaded. See the reverse direction at <a href="./jwk-convert.html">JWK → PEM</a>.',
    labelRsa: 'RSA (RSASSA-PKCS1-v1_5)',
    labelEcP256: 'EC (P-256 / ES256)',
    labelEcP384: 'EC (P-384 / ES384)',
    labelEcP521: 'EC (P-521 / ES512)',
    unrecognizedKey: 'Unrecognized key',
    pkcs1Sec1Error: 'Detected a PKCS#1 / SEC1 private key, which WebCrypto does not support. Please convert it to PKCS#8 with openssl first (see the hint below).',
    pemDecodeError: 'Unable to decode PEM / base64.',
    kindPrivate: 'PKCS#8 private key',
    kindPublic: 'SPKI public key',
    importFailPrefix: 'Import failed: ',
    importFailSuffix: ' (make sure it is an SPKI public key or PKCS#8 private key, and RSA / EC)',
  },
  de: {
    inputLabel: 'PEM-Schlüssel (öffentlicher SPKI- oder privater PKCS#8-Schlüssel)',
    inputPlaceholder: '-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----',
    exportPrivateLabel: 'Felder des privaten Schlüssels exportieren (d, p, q, …)',
    exportPrivateHint: 'Falls die Eingabe einen privaten Schlüssel enthält, auch dessen Parameter ausgeben',
    algorithmLabel: 'Algorithmus',
    inputTypeLabel: 'Eingabetyp',
    kidLabel: 'kid (RFC 7638 Thumbprint)',
    jwkLabel: 'JWK (JSON)',
    copyBtn: 'JWK kopieren',
    note: 'WebCrypto unterstützt nur öffentliche SPKI-Schlüssel (<code>BEGIN PUBLIC KEY</code>) und private PKCS#8-Schlüssel (<code>BEGIN PRIVATE KEY</code>). Ältere Schlüssel wie <code>BEGIN RSA PRIVATE KEY</code> (PKCS#1) / <code>BEGIN EC PRIVATE KEY</code> (SEC1) müssen zuerst in PKCS#8 umgewandelt werden: <code>openssl pkcs8 -topk8 -nocrypt -in key.pem</code>. Schlüssel werden lokal im Browser konvertiert und nicht hochgeladen. Die umgekehrte Richtung siehe <a href="./jwk-convert.html">JWK → PEM</a>.',
    labelRsa: 'RSA (RSASSA-PKCS1-v1_5)',
    labelEcP256: 'EC (P-256 / ES256)',
    labelEcP384: 'EC (P-384 / ES384)',
    labelEcP521: 'EC (P-521 / ES512)',
    unrecognizedKey: 'Schlüssel nicht erkannt',
    pkcs1Sec1Error: 'Es wurde ein privater PKCS#1- / SEC1-Schlüssel erkannt, den WebCrypto nicht unterstützt. Bitte zuerst mit openssl in PKCS#8 umwandeln (siehe Hinweis unten).',
    pemDecodeError: 'PEM / Base64 konnte nicht dekodiert werden.',
    kindPrivate: 'Privater PKCS#8-Schlüssel',
    kindPublic: 'Öffentlicher SPKI-Schlüssel',
    importFailPrefix: 'Import fehlgeschlagen: ',
    importFailSuffix: ' (stelle sicher, dass es sich um einen öffentlichen SPKI- oder privaten PKCS#8-Schlüssel vom Typ RSA / EC handelt)',
  },
}
const t = useT(messages)

const input = ref('')
const exportPrivate = ref(false)
const error = ref('')
const result = ref(null)

const ALGS = [
  { params: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, labelKey: 'labelRsa' },
  { params: { name: 'ECDSA', namedCurve: 'P-256' }, labelKey: 'labelEcP256' },
  { params: { name: 'ECDSA', namedCurve: 'P-384' }, labelKey: 'labelEcP384' },
  { params: { name: 'ECDSA', namedCurve: 'P-521' }, labelKey: 'labelEcP521' },
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
      return { key, label: t(a.labelKey) }
    } catch (e) { lastErr = e }
  }
  throw lastErr || new Error(t('unrecognizedKey'))
}

async function convert() {
  error.value = ''
  result.value = null
  const raw = input.value.trim()
  if (!raw) return

  const isPrivate = /BEGIN[^-]*PRIVATE KEY/.test(raw)
  if (/BEGIN RSA PRIVATE KEY|BEGIN EC PRIVATE KEY/.test(raw)) {
    error.value = t('pkcs1Sec1Error')
    return
  }
  let bytes
  try { bytes = pemToBytes(raw) } catch { error.value = t('pemDecodeError'); return }

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
      kind: isPrivate ? t('kindPrivate') : t('kindPublic'),
      thumbprint: tp,
    }
  } catch (e) {
    error.value = t('importFailPrefix') + (e.message || String(e)) + t('importFailSuffix')
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
