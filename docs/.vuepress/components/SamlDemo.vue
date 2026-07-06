<template>
  <div class="authn-tool">
    <div class="authn-row">
      <div class="authn-field">
        <label class="authn-label">{{ t('idpLabel') }}</label>
        <input v-model="issuer" class="authn-input" spellcheck="false" />
      </div>
      <div class="authn-field">
        <label class="authn-label">{{ t('spEntityLabel') }}</label>
        <input v-model="spEntity" class="authn-input" spellcheck="false" />
      </div>
    </div>

    <p class="authn-note">{{ t('introBefore') }} <code>AuthnRequest</code> {{ t('introAfter') }}</p>

    <div class="saml-btns">
      <button class="authn-btn" :disabled="loading" @click="login('alice')">{{ t('loginAsAlice') }}</button>
      <button class="authn-btn" :disabled="loading" @click="login('bob')">{{ t('loginAsBob') }}</button>
      <span v-if="loading" class="authn-note">{{ t('requesting') }}</span>
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
      <label class="authn-label">{{ t('checkResults') }}</label>
      <table class="authn-table"><tbody>
        <tr v-for="c in checks" :key="c.name">
          <td style="white-space:nowrap"><strong>{{ c.name }}</strong></td>
          <td :class="c.ok ? 'authn-ok' : 'authn-bad'">{{ c.ok ? '✔' : '✗' }} {{ c.note }}</td>
        </tr>
      </tbody></table>
    </template>

    <template v-if="attrs.length">
      <label class="authn-label">{{ t('assertionSubjectAttrs') }}</label>
      <table class="authn-table"><tbody>
        <tr v-for="a in attrs" :key="a[0]"><td style="white-space:nowrap"><strong>{{ a[0] }}</strong></td><td style="word-break:break-all">{{ a[1] }}</td></tr>
      </tbody></table>
    </template>

    <template v-if="xml">
      <label class="authn-label">{{ t('signedResponseLabel') }}</label>
      <pre class="authn-pre saml-xml">{{ xml }}</pre>
      <p class="authn-note">{{ t('xmlNoteBefore') }} <a href="../tools/saml-parse.html">{{ t('samlParserLinkText') }}</a> {{ t('orText') }} <a href="../tools/cert.html">{{ t('x509LinkText') }}</a>{{ t('xmlNoteMid') }} <a href="https://mock.authn.tech/saml/sp/" target="_blank">{{ t('mockSpConsoleLinkText') }}</a>{{ t('xmlNoteAfter') }}</p>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { certToSpki } from './x509.js'
import { useT } from './i18n.js'

const messages = {
  zh: {
    idpLabel: 'Mock IdP(issuer)',
    spEntityLabel: '演示 SP entityID',
    introBefore: '选择一个测试用户,发起一次(模拟 SP-initiated 的)SAML 登录:浏览器生成',
    introAfter: '→ 请求 Mock IdP → IdP 签发**签名的 Response** → 本页解码、校验、验签并解析断言。',
    loginAsAlice: '以 alice 登录',
    loginAsBob: '以 bob 登录',
    requesting: '请求中…',
    checkResults: '校验结果',
    assertionSubjectAttrs: '断言主体与属性',
    signedResponseLabel: '签名的 SAML Response(XML)',
    xmlNoteBefore: '可把它丢进',
    samlParserLinkText: 'SAML Response 解析器',
    orText: '或',
    x509LinkText: 'X.509 证书解析',
    xmlNoteMid: '进一步查看;想要服务端权威验签,见',
    mockSpConsoleLinkText: 'Mock SP 控制台',
    xmlNoteAfter: '(用 xml-crypto 独立验签)。',
    step1Label: '1. 演示 SP 生成 AuthnRequest',
    step2Label: '2. 请求 Mock IdP,IdP 验证用户并签发签名 Response',
    step3Label: '3. 解码 base64,得到签名的 SAML Response XML',
    step4Label: '4. 校验协议字段并验证签名',
    step5Label: '5. 从断言读取用户身份与属性,建立会话',
    idpHttpErrorPrefix: 'IdP 返回 HTTP ',
    idpHttpErrorSuffix: '',
    noSamlResponseFound: '未从 IdP 响应中找到 SAMLResponse',
    xmlParseFailed: 'XML 解析失败',
    noAssertionInResponse: 'Response 中没有 Assertion',
    statusCodeCheck: 'StatusCode',
    noneText: '(无)',
    inResponseToCheck: 'InResponseTo',
    inResponseToMatch: '与 AuthnRequest ID 匹配',
    inResponseToMismatchPrefix: '不匹配(',
    missingText: '缺失',
    inResponseToMismatchSuffix: ')',
    audienceCheck: 'Audience',
    audienceMatch: '= 本 SP entityID',
    audienceValuePrefix: '= ',
    conditionsCheck: '时效(Conditions)',
    signatureCheck: '签名验证(SignedInfo / RSA-SHA256)',
    demoFailPrefix: '演示失败:',
    demoFailSuffix: '(若为网络/CORS 错误,可稍后重试或改用 Mock SP 控制台)',
    noSignatureInAssertion: '断言无 Signature',
    missingCert: '缺少 X509Certificate',
    missingSignatureValue: '缺少 SignatureValue',
    signedInfoNotFound: '未定位 SignedInfo',
    sigVerifyPass: '用断言内嵌证书公钥验证通过(SP 还需比对 DigestValue 并校验证书信任链)',
    sigVerifyFail: '验证未通过',
    sigVerifyError: '验签出错:',
  },
  en: {
    idpLabel: 'Mock IdP (issuer)',
    spEntityLabel: 'Demo SP entityID',
    introBefore: 'Pick a test user to start a (simulated SP-initiated) SAML login: the browser generates an',
    introAfter: '→ sends it to the Mock IdP → the IdP issues a **signed Response** → this page decodes, validates, verifies the signature, and parses the assertion.',
    loginAsAlice: 'Log in as alice',
    loginAsBob: 'Log in as bob',
    requesting: 'Requesting…',
    checkResults: 'Validation results',
    assertionSubjectAttrs: 'Assertion subject and attributes',
    signedResponseLabel: 'Signed SAML Response (XML)',
    xmlNoteBefore: 'You can drop it into the',
    samlParserLinkText: 'SAML Response parser',
    orText: 'or',
    x509LinkText: 'X.509 certificate parser',
    xmlNoteMid: 'for further inspection; for authoritative server-side signature verification, see the',
    mockSpConsoleLinkText: 'Mock SP console',
    xmlNoteAfter: '(independently verified with xml-crypto).',
    step1Label: '1. Demo SP generates AuthnRequest',
    step2Label: '2. Request Mock IdP, which authenticates the user and issues a signed Response',
    step3Label: '3. Decode base64 to obtain the signed SAML Response XML',
    step4Label: '4. Validate protocol fields and verify the signature',
    step5Label: '5. Read user identity and attributes from the assertion, and establish a session',
    idpHttpErrorPrefix: 'IdP returned HTTP ',
    idpHttpErrorSuffix: '',
    noSamlResponseFound: 'Could not find SAMLResponse in the IdP response',
    xmlParseFailed: 'XML parsing failed',
    noAssertionInResponse: 'No Assertion found in the Response',
    statusCodeCheck: 'StatusCode',
    noneText: '(none)',
    inResponseToCheck: 'InResponseTo',
    inResponseToMatch: 'matches the AuthnRequest ID',
    inResponseToMismatchPrefix: 'mismatch (',
    missingText: 'missing',
    inResponseToMismatchSuffix: ')',
    audienceCheck: 'Audience',
    audienceMatch: '= this SP entityID',
    audienceValuePrefix: '= ',
    conditionsCheck: 'Validity (Conditions)',
    signatureCheck: 'Signature verification (SignedInfo / RSA-SHA256)',
    demoFailPrefix: 'Demo failed: ',
    demoFailSuffix: ' (if this is a network/CORS error, retry later or use the Mock SP console instead)',
    noSignatureInAssertion: 'Assertion has no Signature',
    missingCert: 'Missing X509Certificate',
    missingSignatureValue: 'Missing SignatureValue',
    signedInfoNotFound: 'Could not locate SignedInfo',
    sigVerifyPass: 'Verified with the public key embedded in the assertion certificate (the SP must also compare DigestValue and validate the certificate trust chain)',
    sigVerifyFail: 'Verification failed',
    sigVerifyError: 'Signature verification error: ',
  },
  de: {
    idpLabel: 'Mock IdP (issuer)',
    spEntityLabel: 'Demo-SP-entityID',
    introBefore: 'Wählen Sie einen Testbenutzer, um einen (simulierten SP-initiated) SAML-Login zu starten: Der Browser erzeugt eine',
    introAfter: '→ sendet sie an den Mock IdP → der IdP stellt eine **signierte Response** aus → diese Seite dekodiert, validiert, verifiziert die Signatur und parst die Assertion.',
    loginAsAlice: 'Als alice anmelden',
    loginAsBob: 'Als bob anmelden',
    requesting: 'Anfrage läuft…',
    checkResults: 'Prüfergebnisse',
    assertionSubjectAttrs: 'Assertion-Subjekt und Attribute',
    signedResponseLabel: 'Signierte SAML Response (XML)',
    xmlNoteBefore: 'Sie können sie in den',
    samlParserLinkText: 'SAML-Response-Parser',
    orText: 'oder',
    x509LinkText: 'X.509-Zertifikatsparser',
    xmlNoteMid: 'zur weiteren Prüfung einfügen; für eine maßgebliche serverseitige Signaturprüfung siehe die',
    mockSpConsoleLinkText: 'Mock-SP-Konsole',
    xmlNoteAfter: '(unabhängig mit xml-crypto verifiziert).',
    step1Label: '1. Demo-SP erzeugt AuthnRequest',
    step2Label: '2. Anfrage an Mock IdP, der den Benutzer authentifiziert und eine signierte Response ausstellt',
    step3Label: '3. Base64 dekodieren, um die signierte SAML-Response-XML zu erhalten',
    step4Label: '4. Protokollfelder validieren und Signatur verifizieren',
    step5Label: '5. Benutzeridentität und Attribute aus der Assertion lesen und Sitzung aufbauen',
    idpHttpErrorPrefix: 'IdP hat HTTP-Status ',
    idpHttpErrorSuffix: ' zurückgegeben',
    noSamlResponseFound: 'SAMLResponse wurde in der IdP-Antwort nicht gefunden',
    xmlParseFailed: 'XML-Parsing fehlgeschlagen',
    noAssertionInResponse: 'Keine Assertion in der Response gefunden',
    statusCodeCheck: 'StatusCode',
    noneText: '(keiner)',
    inResponseToCheck: 'InResponseTo',
    inResponseToMatch: 'stimmt mit der AuthnRequest-ID überein',
    inResponseToMismatchPrefix: 'stimmt nicht überein (',
    missingText: 'fehlt',
    inResponseToMismatchSuffix: ')',
    audienceCheck: 'Audience',
    audienceMatch: '= diese SP-entityID',
    audienceValuePrefix: '= ',
    conditionsCheck: 'Gültigkeit (Conditions)',
    signatureCheck: 'Signaturprüfung (SignedInfo / RSA-SHA256)',
    demoFailPrefix: 'Demo fehlgeschlagen: ',
    demoFailSuffix: ' (bei Netzwerk-/CORS-Fehlern später erneut versuchen oder stattdessen die Mock-SP-Konsole verwenden)',
    noSignatureInAssertion: 'Assertion enthält keine Signature',
    missingCert: 'X509Certificate fehlt',
    missingSignatureValue: 'SignatureValue fehlt',
    signedInfoNotFound: 'SignedInfo konnte nicht lokalisiert werden',
    sigVerifyPass: 'Mit dem in der Assertion eingebetteten Zertifikats-Public-Key erfolgreich verifiziert (der SP muss zusätzlich DigestValue vergleichen und die Zertifikatsvertrauenskette prüfen)',
    sigVerifyFail: 'Verifizierung fehlgeschlagen',
    sigVerifyError: 'Fehler bei der Signaturprüfung: ',
  },
}
const t = useT(messages)

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
    steps.value.push({ label: t('step1Label'), detail: `ID = ${reqId}` })

    // 2. 请求 Mock IdP(演示中直接指定 user,免去用户选择页),取回自动 POST 表单
    const base = issuer.value.replace(/\/$/, '')
    const url = `${base}/saml/idp/sso?user=${encodeURIComponent(user)}&sp=${encodeURIComponent(spEntity.value)}&acs=${encodeURIComponent(acs)}&rid=${encodeURIComponent(reqId)}`
    steps.value.push({ label: t('step2Label'), detail: url })
    const res = await fetch(url)
    if (!res.ok) throw new Error(t('idpHttpErrorPrefix') + res.status + t('idpHttpErrorSuffix'))
    const html = await res.text()

    // 3. 从返回的 HTTP-POST 表单中取出 SAMLResponse 并解码
    const formDoc = new DOMParser().parseFromString(html, 'text/html')
    const field = formDoc.querySelector('input[name="SAMLResponse"]')
    if (!field) throw new Error(t('noSamlResponseFound'))
    const responseXml = new TextDecoder().decode(b64ToBytes(field.value))
    xml.value = responseXml
    steps.value.push({ label: t('step3Label') })

    // 4. 解析
    const doc = new DOMParser().parseFromString(responseXml, 'text/xml')
    if (doc.getElementsByTagName('parsererror').length) throw new Error(t('xmlParseFailed'))
    const root = doc.documentElement
    const assertion = root.getElementsByTagNameNS('*', 'Assertion')[0]
    if (!assertion) throw new Error(t('noAssertionInResponse'))
    steps.value.push({ label: t('step4Label') })

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
      { name: t('statusCodeCheck'), ok: statusCode.endsWith(':Success'), note: statusCode.replace('urn:oasis:names:tc:SAML:2.0:status:', '') || t('noneText') },
      { name: t('inResponseToCheck'), ok: inResponseTo === reqId, note: inResponseTo === reqId ? t('inResponseToMatch') : `${t('inResponseToMismatchPrefix')}${inResponseTo || t('missingText')}${t('inResponseToMismatchSuffix')}` },
      { name: t('audienceCheck'), ok: audience === spEntity.value, note: audience === spEntity.value ? t('audienceMatch') : `${t('audienceValuePrefix')}${audience || t('missingText')}` },
      { name: t('conditionsCheck'), ok: timeOk, note: `${nb || '—'} → ${noa || '—'}` },
    )

    // 4b. 签名验证:用断言内嵌证书验证 SignedInfo(RSA-SHA256)
    const verdict = await verifySignedInfo(responseXml, assertion)
    checks.value.push({
      name: t('signatureCheck'),
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
    steps.value.push({ label: t('step5Label') })
  } catch (e) {
    error.value = t('demoFailPrefix') + (e.message || String(e)) + t('demoFailSuffix')
  } finally {
    loading.value = false
  }
}

async function verifySignedInfo(responseXml, assertion) {
  try {
    const sig = assertion.getElementsByTagNameNS(DS, 'Signature')[0]
    if (!sig) return { ok: false, note: t('noSignatureInAssertion') }
    // 取签名所用证书的公钥(SPKI)
    const certB64 = (assertion.getElementsByTagNameNS(DS, 'X509Certificate')[0] || {}).textContent
    if (!certB64) return { ok: false, note: t('missingCert') }
    const spki = certToSpki(certB64.trim())
    const key = await crypto.subtle.importKey('spki', spki, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    // SignatureValue
    const sigVal = (sig.getElementsByTagNameNS(DS, 'SignatureValue')[0] || {}).textContent
    if (!sigVal) return { ok: false, note: t('missingSignatureValue') }
    // SignedInfo 的规范化字节:Mock 采用“生成即规范化(exc-c14n)”,SignedInfo 已内联 xmlns:ds,
    // 故其在 XML 中的原文子串即为被签名的规范化字节。
    const m = /<ds:SignedInfo[\s\S]*?<\/ds:SignedInfo>/.exec(responseXml)
    if (!m) return { ok: false, note: t('signedInfoNotFound') }
    const signedInfoBytes = new TextEncoder().encode(m[0])
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64ToBytes(sigVal), signedInfoBytes)
    return {
      ok,
      note: ok
        ? t('sigVerifyPass')
        : t('sigVerifyFail'),
    }
  } catch (e) {
    return { ok: false, note: t('sigVerifyError') + (e.message || e) }
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
