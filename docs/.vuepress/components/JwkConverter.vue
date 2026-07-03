<template>
  <div class="authn-tool">
    <label class="authn-label">JWK 或 JWKS（JSON）</label>
    <textarea v-model="input" class="authn-textarea" rows="7" spellcheck="false"
      placeholder='{"kty":"RSA","n":"...","e":"AQAB"} 或 {"keys":[...]}' @input="convert"></textarea>
    <p v-if="error" class="authn-error">{{ error }}</p>

    <div v-for="(k, i) in keys" :key="i" class="jwk-card">
      <table class="authn-table"><tbody>
        <tr><td><strong>kty</strong></td><td>{{ k.meta.kty }}<span v-if="k.meta.crv">（{{ k.meta.crv }}）</span></td></tr>
        <tr v-if="k.meta.alg"><td><strong>alg</strong></td><td>{{ k.meta.alg }}</td></tr>
        <tr v-if="k.meta.use"><td><strong>use</strong></td><td>{{ k.meta.use }}</td></tr>
        <tr><td><strong>kid（原始）</strong></td><td style="word-break:break-all">{{ k.meta.kid || '（无）' }}</td></tr>
        <tr><td><strong>kid（RFC 7638 指纹）</strong></td><td style="word-break:break-all">{{ k.thumbprint }}</td></tr>
        <tr v-if="k.isPrivate"><td><strong>类型</strong></td><td>含私钥字段(仅导出公钥 PEM)</td></tr>
      </tbody></table>
      <label class="authn-label">公钥 PEM（SPKI）</label>
      <pre class="authn-pre">{{ k.pem }}</pre>
    </div>
    <p v-if="keys.length" class="authn-note">仅导出公钥 PEM。密钥在浏览器本地转换,不上传。可配合 <a href="./jwt.html">JWT 验签</a>。</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const input = ref('')
const error = ref('')
const keys = ref([])

function b64url(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function pem(buf) {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return `-----BEGIN PUBLIC KEY-----\n${btoa(bin).replace(/(.{64})/g, '$1\n')}\n-----END PUBLIC KEY-----`
}
async function thumbprint(jwk) {
  const members = jwk.kty === 'RSA'
    ? { e: jwk.e, kty: jwk.kty, n: jwk.n }
    : { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y }
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(members)))
  return b64url(new Uint8Array(d))
}

async function convert() {
  error.value = ''
  keys.value = []
  if (!input.value.trim()) return
  let parsed
  try { parsed = JSON.parse(input.value) } catch { error.value = '不是合法 JSON。'; return }
  const list = Array.isArray(parsed.keys) ? parsed.keys : [parsed]

  const out = []
  for (const jwk of list) {
    try {
      if (jwk.kty !== 'RSA' && jwk.kty !== 'EC') throw new Error(`暂不支持 kty=${jwk.kty}`)
      // 仅取公钥部分
      const pub = jwk.kty === 'RSA'
        ? { kty: 'RSA', n: jwk.n, e: jwk.e }
        : { kty: 'EC', crv: jwk.crv, x: jwk.x, y: jwk.y }
      const algParams = jwk.kty === 'RSA'
        ? { name: 'RSASSA-PKCS1-v1_5', hash: hashForAlg(jwk.alg) }
        : { name: 'ECDSA', namedCurve: jwk.crv }
      const key = await crypto.subtle.importKey('jwk', pub, algParams, true, ['verify'])
      const spki = await crypto.subtle.exportKey('spki', key)
      out.push({
        meta: { kty: jwk.kty, crv: jwk.crv, alg: jwk.alg, use: jwk.use, kid: jwk.kid },
        thumbprint: await thumbprint(jwk),
        pem: pem(spki),
        isPrivate: !!jwk.d,
      })
    } catch (e) {
      out.push({ meta: { kty: jwk.kty }, thumbprint: '—', pem: '转换失败：' + (e.message || String(e)), isPrivate: false })
    }
  }
  keys.value = out
}

function hashForAlg(alg) {
  if (alg === 'RS384' || alg === 'PS384') return 'SHA-384'
  if (alg === 'RS512' || alg === 'PS512') return 'SHA-512'
  return 'SHA-256'
}
</script>

<style scoped>
.jwk-card { border: 1px solid var(--vp-c-border, #dcdfe6); border-radius: 8px; padding: 0.8rem 1rem; margin-top: 1rem; }
</style>
<style scoped src="./tool-style.css"></style>
