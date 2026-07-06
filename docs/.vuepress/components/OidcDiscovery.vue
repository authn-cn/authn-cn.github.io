<template>
  <div class="authn-tool">
    <label class="authn-label">OP Issuer 或 Discovery URL</label>
    <input v-model="issuer" class="authn-input" spellcheck="false" placeholder="https://your-op.example" />
    <p></p>
    <button class="authn-btn" :disabled="busy" @click="load">{{ busy ? '拉取中…' : '拉取 Discovery' }}</button>
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
    <p class="authn-note">直接从你的浏览器请求目标 OP。若目标未开启 CORS,浏览器会拦截请求(本站 Mock OP 已开启 CORS)。</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const issuer = ref('https://mock.authn.tech')
const busy = ref(false)
const error = ref('')
const doc = ref(null)
const docJson = ref('')
const jwksJson = ref('')
const jwksCount = ref(0)
const endpoints = ref([])
const caps = ref([])

async function load() {
  error.value = ''
  doc.value = null
  busy.value = true
  try {
    const base = issuer.value.trim().replace(/\/$/, '')
    const url = base.includes('/.well-known/openid-configuration') ? base : base + '/.well-known/openid-configuration'
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const d = await res.json()
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

    if (d.jwks_uri) {
      try {
        const jr = await fetch(d.jwks_uri, { headers: { Accept: 'application/json' } })
        const jwks = await jr.json()
        jwksCount.value = (jwks.keys || []).length
        jwksJson.value = JSON.stringify(jwks, null, 2)
      } catch {
        jwksJson.value = '(拉取 JWKS 失败,可能是 CORS 限制)'
        jwksCount.value = 0
      }
    }
  } catch (e) {
    error.value = '拉取失败：' + (e.message || String(e)) + '（可能是地址错误或目标未开启 CORS）'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped src="./tool-style.css"></style>
