<template>
  <div class="authn-tool">
    <div class="authn-tabs">
      <button class="authn-tab" :class="{ active: mode === 'url' }" @click="mode = 'url'">按 URL 拉取</button>
      <button class="authn-tab" :class="{ active: mode === 'paste' }" @click="mode = 'paste'">手工粘贴 JSON</button>
    </div>

    <template v-if="mode === 'url'">
      <label class="authn-label">OP Issuer 或 Discovery URL</label>
      <input v-model="issuer" class="authn-input" spellcheck="false" placeholder="https://your-op.example" />
      <p></p>
      <button class="authn-btn" :disabled="busy" @click="load">{{ busy ? '拉取中…' : '拉取 Discovery' }}</button>
    </template>

    <template v-else>
      <label class="authn-label">Discovery 文档 JSON(<code>/.well-known/openid-configuration</code> 的内容)</label>
      <textarea v-model="pasteDoc" class="authn-textarea" rows="8" spellcheck="false"
        placeholder='{ "issuer": "https://your-op.example", "authorization_endpoint": "...", ... }'></textarea>
      <label class="authn-label">JWKS JSON(可选,<code>jwks_uri</code> 的内容)</label>
      <textarea v-model="pasteJwks" class="authn-textarea" rows="5" spellcheck="false"
        placeholder='{ "keys": [ { "kty": "RSA", ... } ] }'></textarea>
      <p></p>
      <button class="authn-btn" @click="parsePaste">解析</button>
    </template>

    <p v-if="error" class="authn-error">{{ error }}</p>

    <template v-if="doc">
      <label class="authn-label">关键端点</label>
      <table class="authn-table">
        <tbody>
          <tr v-for="row in endpoints" :key="row[0]"><td><code>{{ row[0] }}</code></td><td style="word-break:break-all">{{ row[1] }}</td></tr>
        </tbody>
      </table>

      <label class="authn-label">支持能力</label>
      <table class="authn-table">
        <tbody>
          <tr v-for="row in caps" :key="row[0]"><td><code>{{ row[0] }}</code></td><td>{{ row[1] }}</td></tr>
        </tbody>
      </table>

      <label class="authn-label">完整 Discovery 文档</label>
      <pre class="authn-pre">{{ docJson }}</pre>

      <label class="authn-label">JWKS（{{ jwksCount }} 个密钥）</label>
      <pre class="authn-pre">{{ jwksJson }}</pre>
    </template>
    <p class="authn-note">「按 URL 拉取」直接从你的浏览器请求目标 OP;若目标未开启 CORS,浏览器会拦截请求(本站 Mock OP 已开启 CORS)。这种情况下可用 <code>curl</code> 取到文档后切到「手工粘贴 JSON」。</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const mode = ref('url')
const issuer = ref('https://mock.authn.tech')
const pasteDoc = ref('')
const pasteJwks = ref('')
const busy = ref(false)
const error = ref('')
const doc = ref(null)
const docJson = ref('')
const jwksJson = ref('')
const jwksCount = ref(0)
const endpoints = ref([])
const caps = ref([])

function applyDoc(d) {
  doc.value = d
  docJson.value = JSON.stringify(d, null, 2)
  endpoints.value = [
    ['issuer', d.issuer],
    ['authorization_endpoint', d.authorization_endpoint],
    ['token_endpoint', d.token_endpoint],
    ['userinfo_endpoint', d.userinfo_endpoint],
    ['jwks_uri', d.jwks_uri],
    ['end_session_endpoint', d.end_session_endpoint],
    ['registration_endpoint', d.registration_endpoint],
  ].filter((r) => r[1])
  caps.value = [
    ['scopes_supported', (d.scopes_supported || []).join(' ')],
    ['response_types_supported', (d.response_types_supported || []).join(', ')],
    ['grant_types_supported', (d.grant_types_supported || []).join(', ')],
    ['id_token_signing_alg_values_supported', (d.id_token_signing_alg_values_supported || []).join(', ')],
    ['code_challenge_methods_supported', (d.code_challenge_methods_supported || []).join(', ')],
    ['token_endpoint_auth_methods_supported', (d.token_endpoint_auth_methods_supported || []).join(', ')],
  ].filter((r) => r[1])
}
function applyJwks(jwks) {
  jwksCount.value = (jwks.keys || []).length
  jwksJson.value = JSON.stringify(jwks, null, 2)
}
function clearJwks() {
  jwksCount.value = 0
  jwksJson.value = ''
}

async function load() {
  error.value = ''
  doc.value = null
  busy.value = true
  clearJwks()
  try {
    const base = issuer.value.trim().replace(/\/$/, '')
    const url = base.includes('/.well-known/openid-configuration') ? base : base + '/.well-known/openid-configuration'
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    applyDoc(await res.json())

    if (doc.value.jwks_uri) {
      try {
        const jr = await fetch(doc.value.jwks_uri, { headers: { Accept: 'application/json' } })
        applyJwks(await jr.json())
      } catch {
        jwksJson.value = '(拉取 JWKS 失败,可能是 CORS 限制;可切到手工粘贴模式贴入 JWKS)'
        jwksCount.value = 0
      }
    }
  } catch (e) {
    error.value = '拉取失败：' + (e.message || String(e)) + '（可能是地址错误或目标未开启 CORS;可改用手工粘贴模式）'
  } finally {
    busy.value = false
  }
}

function parsePaste() {
  error.value = ''
  doc.value = null
  clearJwks()
  let d
  try {
    d = JSON.parse(pasteDoc.value)
  } catch {
    error.value = 'Discovery 文档不是合法 JSON。'
    return
  }
  applyDoc(d)
  if (pasteJwks.value.trim()) {
    try {
      applyJwks(JSON.parse(pasteJwks.value))
    } catch {
      jwksJson.value = '(JWKS 不是合法 JSON)'
      jwksCount.value = 0
    }
  }
}
</script>

<style scoped src="./tool-style.css"></style>
