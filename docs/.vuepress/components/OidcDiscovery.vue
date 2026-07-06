<template>
  <div class="authn-tool">
    <div class="authn-tabs">
      <button class="authn-tab" :class="{ active: mode === 'url' }" @click="mode = 'url'">{{ t('tabUrl') }}</button>
      <button class="authn-tab" :class="{ active: mode === 'paste' }" @click="mode = 'paste'">{{ t('tabPaste') }}</button>
    </div>

    <template v-if="mode === 'url'">
      <label class="authn-label">{{ t('issuerLabel') }}</label>
      <input v-model="issuer" class="authn-input" spellcheck="false" :placeholder="t('issuerPlaceholder')" />
      <p></p>
      <button class="authn-btn" :disabled="busy" @click="load">{{ busy ? t('fetching') : t('fetchBtn') }}</button>
    </template>

    <template v-else>
      <label class="authn-label">{{ t('pasteDocLabel') }}<code>/.well-known/openid-configuration</code>{{ t('pasteDocLabelSuffix') }}</label>
      <textarea v-model="pasteDoc" class="authn-textarea" rows="8" spellcheck="false"
        :placeholder="t('pasteDocPlaceholder')"></textarea>
      <label class="authn-label">{{ t('pasteJwksLabel') }}<code>jwks_uri</code>{{ t('pasteJwksLabelSuffix') }}</label>
      <textarea v-model="pasteJwks" class="authn-textarea" rows="5" spellcheck="false"
        :placeholder="t('pasteJwksPlaceholder')"></textarea>
      <p></p>
      <button class="authn-btn" @click="parsePaste">{{ t('parseBtn') }}</button>
    </template>

    <p v-if="error" class="authn-error">{{ error }}</p>

    <template v-if="doc">
      <label class="authn-label">{{ t('endpointsLabel') }}</label>
      <table class="authn-table">
        <tbody>
          <tr v-for="row in endpoints" :key="row[0]"><td><code>{{ row[0] }}</code></td><td style="word-break:break-all">{{ row[1] }}</td></tr>
        </tbody>
      </table>

      <label class="authn-label">{{ t('capsLabel') }}</label>
      <table class="authn-table">
        <tbody>
          <tr v-for="row in caps" :key="row[0]"><td><code>{{ row[0] }}</code></td><td>{{ row[1] }}</td></tr>
        </tbody>
      </table>

      <label class="authn-label">{{ t('fullDocLabel') }}</label>
      <pre class="authn-pre">{{ docJson }}</pre>

      <label class="authn-label">{{ t('jwksLabelPre') }}{{ jwksCount }}{{ t('jwksLabelPost') }}</label>
      <pre class="authn-pre">{{ jwksJson }}</pre>
    </template>
    <p class="authn-note">{{ t('footerNotePre') }}<code>curl</code>{{ t('footerNotePost') }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useT } from './i18n.js'

const messages = {
  zh: {
    tabUrl: '按 URL 拉取',
    tabPaste: '手工粘贴 JSON',
    issuerLabel: 'OP Issuer 或 Discovery URL',
    issuerPlaceholder: 'https://your-op.example',
    fetching: '拉取中…',
    fetchBtn: '拉取 Discovery',
    pasteDocLabel: 'Discovery 文档 JSON(',
    pasteDocLabelSuffix: ' 的内容)',
    pasteDocPlaceholder: '{ "issuer": "https://your-op.example", "authorization_endpoint": "...", ... }',
    pasteJwksLabel: 'JWKS JSON(可选,',
    pasteJwksLabelSuffix: ' 的内容)',
    pasteJwksPlaceholder: '{ "keys": [ { "kty": "RSA", ... } ] }',
    parseBtn: '解析',
    endpointsLabel: '关键端点',
    capsLabel: '支持能力',
    fullDocLabel: '完整 Discovery 文档',
    jwksLabelPre: 'JWKS（',
    jwksLabelPost: ' 个密钥）',
    footerNotePre: '「按 URL 拉取」直接从你的浏览器请求目标 OP;若目标未开启 CORS,浏览器会拦截请求(本站 Mock OP 已开启 CORS)。这种情况下可用 ',
    footerNotePost: ' 取到文档后切到「手工粘贴 JSON」。',
    jwksFetchFail: '(拉取 JWKS 失败,可能是 CORS 限制;可切到手工粘贴模式贴入 JWKS)',
    fetchFailPre: '拉取失败：',
    fetchFailPost: '（可能是地址错误或目标未开启 CORS;可改用手工粘贴模式）',
    docNotJson: 'Discovery 文档不是合法 JSON。',
    jwksNotJson: '(JWKS 不是合法 JSON)',
  },
  en: {
    tabUrl: 'Fetch by URL',
    tabPaste: 'Paste JSON manually',
    issuerLabel: 'OP Issuer or Discovery URL',
    issuerPlaceholder: 'https://your-op.example',
    fetching: 'Fetching…',
    fetchBtn: 'Fetch Discovery',
    pasteDocLabel: 'Discovery document JSON (contents of ',
    pasteDocLabelSuffix: ')',
    pasteDocPlaceholder: '{ "issuer": "https://your-op.example", "authorization_endpoint": "...", ... }',
    pasteJwksLabel: 'JWKS JSON (optional, contents of ',
    pasteJwksLabelSuffix: ')',
    pasteJwksPlaceholder: '{ "keys": [ { "kty": "RSA", ... } ] }',
    parseBtn: 'Parse',
    endpointsLabel: 'Key endpoints',
    capsLabel: 'Supported capabilities',
    fullDocLabel: 'Full Discovery document',
    jwksLabelPre: 'JWKS (',
    jwksLabelPost: ' keys)',
    footerNotePre: '"Fetch by URL" requests the target OP directly from your browser; if the target has not enabled CORS, the browser will block the request (this site\'s Mock OP has CORS enabled). In that case, use ',
    footerNotePost: ' to fetch the document, then switch to "Paste JSON manually".',
    jwksFetchFail: '(Failed to fetch JWKS, possibly due to CORS restrictions; you can switch to paste mode and paste the JWKS)',
    fetchFailPre: 'Fetch failed: ',
    fetchFailPost: ' (the address may be wrong, or the target has not enabled CORS; you can switch to paste mode instead)',
    docNotJson: 'The Discovery document is not valid JSON.',
    jwksNotJson: '(JWKS is not valid JSON)',
  },
  de: {
    tabUrl: 'Per URL abrufen',
    tabPaste: 'JSON manuell einfügen',
    issuerLabel: 'OP-Issuer oder Discovery-URL',
    issuerPlaceholder: 'https://your-op.example',
    fetching: 'Wird abgerufen…',
    fetchBtn: 'Discovery abrufen',
    pasteDocLabel: 'Discovery-Dokument JSON (Inhalt von ',
    pasteDocLabelSuffix: ')',
    pasteDocPlaceholder: '{ "issuer": "https://your-op.example", "authorization_endpoint": "...", ... }',
    pasteJwksLabel: 'JWKS JSON (optional, Inhalt von ',
    pasteJwksLabelSuffix: ')',
    pasteJwksPlaceholder: '{ "keys": [ { "kty": "RSA", ... } ] }',
    parseBtn: 'Parsen',
    endpointsLabel: 'Wichtige Endpunkte',
    capsLabel: 'Unterstützte Fähigkeiten',
    fullDocLabel: 'Vollständiges Discovery-Dokument',
    jwksLabelPre: 'JWKS (',
    jwksLabelPost: ' Schlüssel)',
    footerNotePre: '„Per URL abrufen" fragt den Ziel-OP direkt aus deinem Browser ab; falls das Ziel kein CORS aktiviert hat, blockiert der Browser die Anfrage (der Mock-OP dieser Seite hat CORS aktiviert). In diesem Fall kannst du das Dokument mit ',
    footerNotePost: ' abrufen und dann zu „JSON manuell einfügen" wechseln.',
    jwksFetchFail: '(Abruf der JWKS fehlgeschlagen, möglicherweise wegen CORS-Beschränkungen; du kannst in den Einfügemodus wechseln und die JWKS dort einfügen)',
    fetchFailPre: 'Abruf fehlgeschlagen: ',
    fetchFailPost: ' (die Adresse könnte falsch sein, oder das Ziel hat kein CORS aktiviert; du kannst stattdessen den Einfügemodus verwenden)',
    docNotJson: 'Das Discovery-Dokument ist kein gültiges JSON.',
    jwksNotJson: '(JWKS ist kein gültiges JSON)',
  },
}
const t = useT(messages)

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
        jwksJson.value = t('jwksFetchFail')
        jwksCount.value = 0
      }
    }
  } catch (e) {
    error.value = t('fetchFailPre') + (e.message || String(e)) + t('fetchFailPost')
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
    error.value = t('docNotJson')
    return
  }
  applyDoc(d)
  if (pasteJwks.value.trim()) {
    try {
      applyJwks(JSON.parse(pasteJwks.value))
    } catch {
      jwksJson.value = t('jwksNotJson')
      jwksCount.value = 0
    }
  }
}
</script>

<style scoped src="./tool-style.css"></style>
