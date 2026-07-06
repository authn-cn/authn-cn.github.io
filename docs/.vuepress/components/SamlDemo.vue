<template>
  <div class="authn-tool">
    <div class="authn-row">
      <div class="authn-field">
        <label class="authn-label">Mock IdP(issuer)</label>
        <input v-model="issuer" class="authn-input" spellcheck="false" />
      </div>
      <div class="authn-field">
        <label class="authn-label">演示 SP entityID</label>
        <input v-model="spEntity" class="authn-input" spellcheck="false" />
      </div>
    </div>

    <p class="authn-note">选择一个测试用户,发起一次(模拟 SP-initiated 的)SAML 登录:浏览器生成 <code>AuthnRequest</code> → 请求 Mock IdP → IdP 签发**签名的 Response** → 本页解码、校验、验签并解析断言。</p>

    <div class="saml-btns">
      <button class="authn-btn" :disabled="loading" @click="login('alice')">以 alice 登录</button>
      <button class="authn-btn" :disabled="loading" @click="login('bob')">以 bob 登录</button>
      <span v-if="loading" class="authn-note">请求中…</span>
    </div>

    <p v-if="error" class="authn-error">{{ error }}</p>

    <template v-if="steps.length">
      <ol class="saml-steps">
        <li v-for="(s, i) in steps" :key="i">
          <span class="saml-step-t">{{ s.label }}</span>
          <div v-if="s.detail" class="saml-step-d"><code>{{ s.detail }}</code></div>
        </li>
      </ol>
    </template>

    <template v-if="checks.length">
      <label class="authn-label">校验结果</label>
      <table class="authn-table"><tbody>
        <tr v-for="c in checks" :key="c.name">
          <td style="white-space:nowrap"><strong>{{ c.name }}</strong></td>
          <td :class="c.ok ? 'authn-ok' : 'authn-bad'">{{ c.ok ? '✔' : '✗' }} {{ c.note }}</td>
        </tr>
      </tbody></table>
    </template>

    <template v-if="attrs.length">
      <label class="authn-label">断言主体与属性</label>
      <table class="authn-table"><tbody>
        <tr v-for="a in attrs" :key="a[0]"><td style="white-space:nowrap"><strong>{{ a[0] }}</strong></td><td style="word-break:break-all">{{ a[1] }}</td></tr>
      </tbody></table>
    </template>

    <template v-if="xml">
      <label class="authn-label">签名的 SAML Response(XML)</label>
      <pre class="authn-pre saml-xml">{{ xml }}</pre>
      <p class="authn-note">可把它丢进 <a href="../tools/saml-parse.html">SAML Response 解析器</a> 或 <a href="../tools/cert.html">X.509 证书解析</a> 进一步查看;想要服务端权威验签,见 <a href="https://mock.authn.tech/saml/sp/" target="_blank">Mock SP 控制台</a>(用 xml-crypto 独立验签)。</p>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { certToSpki } from './x509.js'

const DS = 'http://www.w3.org/2000/09/xmldsig#'
const issuer = ref('https://mock.authn.tech')
const spEntity = ref('https://demo.sp.authn.tech/entity')
const acs = 'https://demo.sp.authn.tech/acs'

const loading = ref(false)
const error = ref('')
const steps = ref([])
const checks = ref([])
const attrs = ref([])
const xml = ref('')

function randId() {
  const b = crypto.getRandomValues(new Uint8Array(16))
  return '_' + Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}
function b64ToBytes(b64) {
  const bin = atob(b64.replace(/\s/g, ''))
  const a = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i)
  return a
}
function tNS(el, local) {
  const n = el.getElementsByTagNameNS('*', local)[0]
  return n ? n.textContent.trim() : undefined
}
function aNS(el, local, attr) {
  const n = el.getElementsByTagNameNS('*', local)[0]
  return n ? n.getAttribute(attr) || undefined : undefined
}

async function login(user) {
  loading.value = true
  error.value = ''
  steps.value = []
  checks.value = []
  attrs.value = []
  xml.value = ''
  try {
    // 1. SP 生成 AuthnRequest
    const reqId = randId()
    steps.value.push({ label: '1. 演示 SP 生成 AuthnRequest', detail: `ID = ${reqId}` })

    // 2. 请求 Mock IdP(演示中直接指定 user,免去用户选择页),取回自动 POST 表单
    const base = issuer.value.replace(/\/$/, '')
    const url = `${base}/saml/idp/sso?user=${encodeURIComponent(user)}&sp=${encodeURIComponent(spEntity.value)}&acs=${encodeURIComponent(acs)}&rid=${encodeURIComponent(reqId)}`
    steps.value.push({ label: '2. 请求 Mock IdP,IdP 验证用户并签发签名 Response', detail: url })
    const res = await fetch(url)
    if (!res.ok) throw new Error(`IdP 返回 HTTP ${res.status}`)
    const html = await res.text()

    // 3. 从返回的 HTTP-POST 表单中取出 SAMLResponse 并解码
    const formDoc = new DOMParser().parseFromString(html, 'text/html')
    const field = formDoc.querySelector('input[name="SAMLResponse"]')
    if (!field) throw new Error('未从 IdP 响应中找到 SAMLResponse')
    const responseXml = new TextDecoder().decode(b64ToBytes(field.value))
    xml.value = responseXml
    steps.value.push({ label: '3. 解码 base64,得到签名的 SAML Response XML' })

    // 4. 解析
    const doc = new DOMParser().parseFromString(responseXml, 'text/xml')
    if (doc.getElementsByTagName('parsererror').length) throw new Error('XML 解析失败')
    const root = doc.documentElement
    const assertion = root.getElementsByTagNameNS('*', 'Assertion')[0]
    if (!assertion) throw new Error('Response 中没有 Assertion')
    steps.value.push({ label: '4. 校验协议字段并验证签名' })

    // 4a. 逻辑校验
    const statusCode = aNS(root, 'StatusCode', 'Value') || ''
    const audience = tNS(assertion, 'Audience')
    const inResponseTo = root.getAttribute('InResponseTo')
    const cond = assertion.getElementsByTagNameNS('*', 'Conditions')[0]
    const nb = cond && cond.getAttribute('NotBefore')
    const noa = cond && cond.getAttribute('NotOnOrAfter')
    const now = Date.now()
    const timeOk = (!nb || now >= Date.parse(nb)) && (!noa || now < Date.parse(noa))

    checks.value.push(
      { name: 'StatusCode', ok: statusCode.endsWith(':Success'), note: statusCode.replace('urn:oasis:names:tc:SAML:2.0:status:', '') || '(无)' },
      { name: 'InResponseTo', ok: inResponseTo === reqId, note: inResponseTo === reqId ? '与 AuthnRequest ID 匹配' : `不匹配(${inResponseTo || '缺失'})` },
      { name: 'Audience', ok: audience === spEntity.value, note: audience === spEntity.value ? '= 本 SP entityID' : `= ${audience || '缺失'}` },
      { name: '时效(Conditions)', ok: timeOk, note: `${nb || '—'} → ${noa || '—'}` },
    )

    // 4b. 签名验证:用断言内嵌证书验证 SignedInfo(RSA-SHA256)
    const verdict = await verifySignedInfo(responseXml, assertion)
    checks.value.push({
      name: '签名验证(SignedInfo / RSA-SHA256)',
      ok: verdict.ok,
      note: verdict.note,
    })

    // 5. 读取主体与属性
    const rows = [
      ['NameID', tNS(assertion, 'NameID')],
      ['NameID Format', (aNS(assertion, 'NameID', 'Format') || '').replace(/urn:oasis:names:tc:SAML:[\d.]+:nameid-format:/, '')],
      ['Issuer', tNS(assertion, 'Issuer')],
    ]
    for (const at of Array.from(assertion.getElementsByTagNameNS('*', 'Attribute'))) {
      const vals = Array.from(at.getElementsByTagNameNS('*', 'AttributeValue')).map((v) => v.textContent.trim())
      rows.push([at.getAttribute('Name'), vals.join(', ')])
    }
    attrs.value = rows.filter((r) => r[1])
    steps.value.push({ label: '5. 从断言读取用户身份与属性,建立会话' })
  } catch (e) {
    error.value = '演示失败:' + (e.message || String(e)) + '(若为网络/CORS 错误,可稍后重试或改用 Mock SP 控制台)'
  } finally {
    loading.value = false
  }
}

async function verifySignedInfo(responseXml, assertion) {
  try {
    const sig = assertion.getElementsByTagNameNS(DS, 'Signature')[0]
    if (!sig) return { ok: false, note: '断言无 Signature' }
    // 取签名所用证书的公钥(SPKI)
    const certB64 = (assertion.getElementsByTagNameNS(DS, 'X509Certificate')[0] || {}).textContent
    if (!certB64) return { ok: false, note: '缺少 X509Certificate' }
    const spki = certToSpki(certB64.trim())
    const key = await crypto.subtle.importKey('spki', spki, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    // SignatureValue
    const sigVal = (sig.getElementsByTagNameNS(DS, 'SignatureValue')[0] || {}).textContent
    if (!sigVal) return { ok: false, note: '缺少 SignatureValue' }
    // SignedInfo 的规范化字节:Mock 采用“生成即规范化(exc-c14n)”,SignedInfo 已内联 xmlns:ds,
    // 故其在 XML 中的原文子串即为被签名的规范化字节。
    const m = /<ds:SignedInfo[\s\S]*?<\/ds:SignedInfo>/.exec(responseXml)
    if (!m) return { ok: false, note: '未定位 SignedInfo' }
    const signedInfoBytes = new TextEncoder().encode(m[0])
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64ToBytes(sigVal), signedInfoBytes)
    return {
      ok,
      note: ok
        ? '用断言内嵌证书公钥验证通过(SP 还需比对 DigestValue 并校验证书信任链)'
        : '验证未通过',
    }
  } catch (e) {
    return { ok: false, note: '验签出错:' + (e.message || e) }
  }
}
</script>

<style scoped>
.saml-btns { display: flex; align-items: center; gap: 0.6rem; margin: 0.8rem 0; flex-wrap: wrap; }
.saml-steps { margin: 0.6rem 0; padding-left: 1.3rem; }
.saml-steps li { margin: 0.35rem 0; }
.saml-step-t { font-weight: 600; }
.saml-step-d { margin-top: 0.2rem; font-size: 0.78rem; word-break: break-all; opacity: 0.85; }
.saml-xml { max-height: 340px; overflow: auto; font-size: 0.72rem; }
</style>
<style scoped src="./tool-style.css"></style>
