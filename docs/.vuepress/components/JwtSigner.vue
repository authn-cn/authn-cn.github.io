<template>
  <div class="authn-tool">
    <div class="authn-row">
      <div class="authn-field">
        <label class="authn-label">{{ t('algLabel') }}</label>
        <select v-model="alg" class="authn-select">
          <optgroup :label="t('hmacGroup')">
            <option>HS256</option><option>HS384</option><option>HS512</option>
          </optgroup>
          <optgroup label="RSA">
            <option>RS256</option><option>RS384</option><option>RS512</option>
            <option>PS256</option><option>PS384</option><option>PS512</option>
          </optgroup>
          <optgroup label="ECDSA">
            <option>ES256</option><option>ES384</option>
          </optgroup>
        </select>
      </div>
    </div>

    <label class="authn-label">{{ t('payloadLabel') }}</label>
    <textarea v-model="payload" class="authn-textarea" rows="7" spellcheck="false"></textarea>
    <button class="authn-btn secondary" @click="fillTimes">{{ t('fillTimesBtn') }}</button>

    <template v-if="isHmac">
      <label class="authn-label">{{ t('secretLabel') }}</label>
      <input v-model="secret" class="authn-input" spellcheck="false" placeholder="your-256-bit-secret" />
    </template>
    <template v-else>
      <label class="authn-label">{{ t('privPemLabel') }}</label>
      <textarea v-model="privPem" class="authn-textarea" rows="5" spellcheck="false" placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"></textarea>
      <button class="authn-btn secondary" :disabled="busy" @click="genKey">{{ t('genKeyBtn') }}</button>
      <pre v-if="genPubPem" class="authn-pre">{{ genPubPem }}</pre>
    </template>

    <p></p>
    <button class="authn-btn" :disabled="busy" @click="sign">{{ t('signBtn') }}</button>
    <p v-if="error" class="authn-error">{{ error }}</p>

    <template v-if="token">
      <label class="authn-label">{{ t('tokenLabel') }}</label>
      <div class="jwt-colored">
        <span class="c-h">{{ token.split('.')[0] }}</span><span class="c-dot">.</span><span class="c-p">{{ token.split('.')[1] }}</span><span class="c-dot">.</span><span class="c-s">{{ token.split('.')[2] }}</span>
      </div>
      <p class="authn-note" v-html="t('note')"></p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useT } from './i18n.js'

const messages = {
  zh: {
    algLabel: '算法 alg',
    hmacGroup: 'HMAC（对称密钥）',
    payloadLabel: 'Payload（JSON）',
    fillTimesBtn: '填入 iat / exp（现在 / +1h）',
    secretLabel: 'Secret（HMAC）',
    privPemLabel: '私钥 PEM（PKCS#8,与 alg 匹配）',
    genKeyBtn: '生成匹配的测试密钥对',
    signBtn: '签名生成 JWT',
    tokenLabel: '生成的 JWT',
    note: '可复制到 <a href="./jwt.html">JWT 验签工具</a> 用对应密钥/公钥验证。密钥与签名均在浏览器本地完成,不上传。',
    genKeyFail: '生成密钥失败：',
    payloadInvalid: 'Payload 不是合法 JSON',
    signFail: '签名失败：',
  },
  en: {
    algLabel: 'Algorithm (alg)',
    hmacGroup: 'HMAC (symmetric key)',
    payloadLabel: 'Payload (JSON)',
    fillTimesBtn: 'Fill iat / exp (now / +1h)',
    secretLabel: 'Secret (HMAC)',
    privPemLabel: 'Private key PEM (PKCS#8, must match alg)',
    genKeyBtn: 'Generate matching test key pair',
    signBtn: 'Sign to generate JWT',
    tokenLabel: 'Generated JWT',
    note: 'Copy to the <a href="./jwt.html">JWT verification tool</a> to verify with the matching key/public key. Signing and keys are handled entirely in your browser and never uploaded.',
    genKeyFail: 'Key generation failed: ',
    payloadInvalid: 'Payload is not valid JSON',
    signFail: 'Signing failed: ',
  },
  de: {
    algLabel: 'Algorithmus (alg)',
    hmacGroup: 'HMAC (symmetrischer Schlüssel)',
    payloadLabel: 'Payload (JSON)',
    fillTimesBtn: 'iat / exp einfügen (jetzt / +1h)',
    secretLabel: 'Secret (HMAC)',
    privPemLabel: 'Privater Schlüssel PEM (PKCS#8, muss zum alg passen)',
    genKeyBtn: 'Passendes Test-Schlüsselpaar erzeugen',
    signBtn: 'Signieren und JWT erzeugen',
    tokenLabel: 'Erzeugtes JWT',
    note: 'Kann in das <a href="./jwt.html">JWT-Prüfwerkzeug</a> kopiert werden, um mit dem passenden Schlüssel/öffentlichen Schlüssel zu verifizieren. Schlüssel und Signatur werden vollständig lokal im Browser verarbeitet und nicht hochgeladen.',
    genKeyFail: 'Schlüsselerzeugung fehlgeschlagen: ',
    payloadInvalid: 'Payload ist kein gültiges JSON',
    signFail: 'Signieren fehlgeschlagen: ',
  },
}
const t = useT(messages)

const alg = ref('HS256')
const payload = ref('')
const secret = ref('your-256-bit-secret')
const privPem = ref('')
const genPubPem = ref('')
const token = ref('')
const error = ref('')
const busy = ref(false)
const isHmac = computed(() => alg.value.startsWith('HS'))

const ALGS = {
  HS256: { kind: 'hmac', hash: 'SHA-256' }, HS384: { kind: 'hmac', hash: 'SHA-384' }, HS512: { kind: 'hmac', hash: 'SHA-512' },
  RS256: { kind: 'rsa', hash: 'SHA-256' }, RS384: { kind: 'rsa', hash: 'SHA-384' }, RS512: { kind: 'rsa', hash: 'SHA-512' },
  PS256: { kind: 'pss', hash: 'SHA-256', saltLength: 32 }, PS384: { kind: 'pss', hash: 'SHA-384', saltLength: 48 }, PS512: { kind: 'pss', hash: 'SHA-512', saltLength: 64 },
  ES256: { kind: 'ecdsa', hash: 'SHA-256', namedCurve: 'P-256' }, ES384: { kind: 'ecdsa', hash: 'SHA-384', namedCurve: 'P-384' },
}

function b64urlBytes(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlStr(str) {
  return b64urlBytes(new TextEncoder().encode(str))
}
function pemToBytes(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
function pem(label, buf) {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return `-----BEGIN ${label}-----\n${btoa(bin).replace(/(.{64})/g, '$1\n')}\n-----END ${label}-----`
}

function fillTimes() {
  let obj = {}
  try { obj = JSON.parse(payload.value) } catch { obj = {} }
  const now = Math.floor(Date.now() / 1000)
  obj.iat = now
  obj.exp = now + 3600
  payload.value = JSON.stringify(obj, null, 2)
}

async function genKey() {
  error.value = ''
  busy.value = true
  try {
    const cfg = ALGS[alg.value]
    let params
    if (cfg.kind === 'ecdsa') params = { name: 'ECDSA', namedCurve: cfg.namedCurve }
    else params = { name: cfg.kind === 'pss' ? 'RSA-PSS' : 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: cfg.hash }
    const kp = await crypto.subtle.generateKey(params, true, ['sign', 'verify'])
    privPem.value = pem('PRIVATE KEY', await crypto.subtle.exportKey('pkcs8', kp.privateKey))
    genPubPem.value = pem('PUBLIC KEY', await crypto.subtle.exportKey('spki', kp.publicKey))
  } catch (e) {
    error.value = t('genKeyFail') + (e.message || String(e))
  } finally {
    busy.value = false
  }
}

async function sign() {
  error.value = ''
  token.value = ''
  busy.value = true
  try {
    let payloadObj
    try { payloadObj = JSON.parse(payload.value) } catch { throw new Error(t('payloadInvalid')) }
    const cfg = ALGS[alg.value]
    const headerSeg = b64urlStr(JSON.stringify({ alg: alg.value, typ: 'JWT' }))
    const payloadSeg = b64urlStr(JSON.stringify(payloadObj))
    const data = new TextEncoder().encode(headerSeg + '.' + payloadSeg)

    let sigBuf
    if (cfg.kind === 'hmac') {
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret.value), { name: 'HMAC', hash: cfg.hash }, false, ['sign'])
      sigBuf = await crypto.subtle.sign('HMAC', key, data)
    } else {
      const pk = pemToBytes(privPem.value)
      if (cfg.kind === 'rsa') {
        const key = await crypto.subtle.importKey('pkcs8', pk, { name: 'RSASSA-PKCS1-v1_5', hash: cfg.hash }, false, ['sign'])
        sigBuf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data)
      } else if (cfg.kind === 'pss') {
        const key = await crypto.subtle.importKey('pkcs8', pk, { name: 'RSA-PSS', hash: cfg.hash }, false, ['sign'])
        sigBuf = await crypto.subtle.sign({ name: 'RSA-PSS', saltLength: cfg.saltLength }, key, data)
      } else {
        const key = await crypto.subtle.importKey('pkcs8', pk, { name: 'ECDSA', namedCurve: cfg.namedCurve }, false, ['sign'])
        sigBuf = await crypto.subtle.sign({ name: 'ECDSA', hash: cfg.hash }, key, data)
      }
    }
    token.value = headerSeg + '.' + payloadSeg + '.' + b64urlBytes(new Uint8Array(sigBuf))
  } catch (e) {
    error.value = t('signFail') + (e.message || String(e))
  } finally {
    busy.value = false
  }
}

// 预填示例 payload
const now = Math.floor(Date.now() / 1000)
payload.value = JSON.stringify({ sub: '1234567890', name: 'John Doe', iat: now, exp: now + 3600 }, null, 2)
</script>

<style scoped>
.jwt-colored {
  padding: 0.6rem;
  border-radius: 6px;
  background: var(--vp-c-bg-alt, #f6f8fa);
  font-family: var(--font-family-code, ui-monospace, monospace);
  font-size: 0.82rem;
  word-break: break-all;
  line-height: 1.6;
}
.c-h { color: #fb015b; }
.c-p { color: #d63aff; }
.c-s { color: #00b9f1; }
.c-dot { opacity: 0.5; }
</style>
<style scoped src="./tool-style.css"></style>
