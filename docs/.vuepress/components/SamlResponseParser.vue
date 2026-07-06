<template>
  <div class="authn-tool">
    <label class="authn-label">{{ t('inputLabel') }}</label>
    <textarea v-model="input" class="authn-textarea" rows="6" spellcheck="false"
      :placeholder="t('inputPlaceholder')" @input="parse"></textarea>
    <p v-if="error" class="authn-error">{{ error }}</p>

    <template v-if="result">
      <label class="authn-label">Response</label>
      <table class="authn-table"><tbody>
        <tr v-for="r in result.response" :key="r[0]"><td style="white-space:nowrap"><strong>{{ r[0] }}</strong></td><td style="word-break:break-all">{{ r[1] }}</td></tr>
      </tbody></table>

      <div v-for="(a, i) in result.assertions" :key="i">
        <label class="authn-label">Assertion #{{ i + 1 }}</label>
        <table class="authn-table"><tbody>
          <tr v-for="r in a.rows" :key="r[0]"><td style="white-space:nowrap"><strong>{{ r[0] }}</strong></td><td style="word-break:break-all" :class="r[2]">{{ r[1] }}</td></tr>
        </tbody></table>
        <template v-if="a.attrs.length">
          <p class="authn-note">AttributeStatement</p>
          <table class="authn-table"><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody>
            <tr v-for="(at, k) in a.attrs" :key="k"><td><code>{{ at[0] }}</code></td><td style="word-break:break-all">{{ at[1] }}</td></tr>
          </tbody></table>
        </template>
      </div>
      <p class="authn-note" v-html="t('localOnlyNote')"></p>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useT } from './i18n.js'

const messages = {
  zh: {
    inputLabel: 'SAML Response / Assertion（base64、完整 URL 或 XML）',
    inputPlaceholder: '粘贴 SAMLResponse 的值、含 SAMLResponse 的 URL,或原始 XML',
    localOnlyNote: '纯浏览器本地解析,不上传。本工具展示字段结构;签名<strong>有效性</strong>需由 SP 用 IdP 证书验证。',
    notYetValid: '尚未生效',
    expired: '已过期',
    validNow: '在有效期内',
    xmlParseError: 'XML 解析错误',
    typeLabel: '类型',
    topSignatureLabel: '顶层 Signature',
    signaturePresent: '有',
    signatureAbsent: '无',
    validityLabel: '时效',
    signAlgLabel: '签名算法',
    noSignature: '无签名',
    digestAlgLabel: '摘要算法',
    parseFailPrefix: '解析失败：',
    parseFailDefault: '输入不是合法的 SAML 报文',
  },
  en: {
    inputLabel: 'SAML Response / Assertion (base64, full URL, or XML)',
    inputPlaceholder: 'Paste the SAMLResponse value, a URL containing SAMLResponse, or raw XML',
    localOnlyNote: 'Parsed entirely in your browser; nothing is uploaded. This tool shows the field structure; signature <strong>validity</strong> must be verified by the SP using the IdP certificate.',
    notYetValid: 'Not yet valid',
    expired: 'Expired',
    validNow: 'Currently valid',
    xmlParseError: 'XML parse error',
    typeLabel: 'Type',
    topSignatureLabel: 'Top-level Signature',
    signaturePresent: 'Present',
    signatureAbsent: 'Absent',
    validityLabel: 'Validity',
    signAlgLabel: 'Signature algorithm',
    noSignature: 'No signature',
    digestAlgLabel: 'Digest algorithm',
    parseFailPrefix: 'Parsing failed: ',
    parseFailDefault: 'Input is not a valid SAML message',
  },
  de: {
    inputLabel: 'SAML Response / Assertion (base64, vollständige URL oder XML)',
    inputPlaceholder: 'SAMLResponse-Wert, eine URL mit SAMLResponse oder rohes XML einfügen',
    localOnlyNote: 'Wird vollständig lokal im Browser verarbeitet, nichts wird hochgeladen. Dieses Werkzeug zeigt die Feldstruktur; die <strong>Gültigkeit</strong> der Signatur muss vom SP mit dem IdP-Zertifikat geprüft werden.',
    notYetValid: 'Noch nicht gültig',
    expired: 'Abgelaufen',
    validNow: 'Derzeit gültig',
    xmlParseError: 'XML-Parsefehler',
    typeLabel: 'Typ',
    topSignatureLabel: 'Signature (oberste Ebene)',
    signaturePresent: 'Vorhanden',
    signatureAbsent: 'Nicht vorhanden',
    validityLabel: 'Gültigkeitsdauer',
    signAlgLabel: 'Signaturalgorithmus',
    noSignature: 'Keine Signatur',
    digestAlgLabel: 'Digest-Algorithmus',
    parseFailPrefix: 'Verarbeitung fehlgeschlagen: ',
    parseFailDefault: 'Die Eingabe ist keine gültige SAML-Nachricht',
  },
}
const t = useT(messages)

const input = ref('')
const error = ref('')
const result = ref(null)

function b64ToBytes(b64) {
  const bin = atob(b64.replace(/\s/g, ''))
  const a = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i)
  return a
}
async function inflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([bytes]).stream().pipeThrough(ds)
  return new TextDecoder().decode(await new Response(stream).arrayBuffer())
}
function T(el, local) {
  const n = el.getElementsByTagNameNS('*', local)[0]
  return n ? n.textContent.trim() : undefined
}
function A(el, local, attr) {
  const n = el.getElementsByTagNameNS('*', local)[0]
  return n ? n.getAttribute(attr) || undefined : undefined
}
function timeStatus(notBefore, notOnOrAfter) {
  const now = Date.now()
  if (notBefore && now < Date.parse(notBefore)) return [t('notYetValid'), 'authn-bad']
  if (notOnOrAfter && now >= Date.parse(notOnOrAfter)) return [t('expired'), 'authn-bad']
  return [t('validNow'), 'authn-ok']
}

async function parse() {
  error.value = ''
  result.value = null
  let s = input.value.trim()
  if (!s) return
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s)
      s = u.searchParams.get('SAMLResponse') || u.searchParams.get('SAMLRequest') || ''
      s = decodeURIComponent(s)
    }
    let xml
    if (s.startsWith('<')) {
      xml = s
    } else {
      const bytes = b64ToBytes(s)
      const asText = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
      xml = asText.trimStart().startsWith('<') ? asText : await inflateRaw(bytes)
    }

    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    if (doc.getElementsByTagName('parsererror').length) throw new Error(t('xmlParseError'))
    const root = doc.documentElement

    const statusCode = A(root, 'StatusCode', 'Value')
    const responseRows = [
      [t('typeLabel'), root.localName],
      ['ID', root.getAttribute('ID')],
      ['IssueInstant', root.getAttribute('IssueInstant')],
      ['Destination', root.getAttribute('Destination')],
      ['InResponseTo', root.getAttribute('InResponseTo')],
      ['Issuer', T(root, 'Issuer')],
      ['StatusCode', statusCode ? statusCode.replace('urn:oasis:names:tc:SAML:2.0:status:', '') : undefined],
      [t('topSignatureLabel'), root.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature').length ? t('signaturePresent') : t('signatureAbsent')],
    ].filter((r) => r[1] !== null && r[1] !== undefined)

    const assertions = []
    for (const as of Array.from(root.getElementsByTagNameNS('*', 'Assertion'))) {
      const cond = as.getElementsByTagNameNS('*', 'Conditions')[0]
      const nb = cond ? cond.getAttribute('NotBefore') : undefined
      const noa = cond ? cond.getAttribute('NotOnOrAfter') : undefined
      const [tstat, tcls] = timeStatus(nb, noa)
      const sigMethod = A(as, 'SignatureMethod', 'Algorithm')
      const rows = [
        ['Assertion ID', as.getAttribute('ID')],
        ['Issuer', T(as, 'Issuer')],
        ['NameID', T(as, 'NameID')],
        ['NameID Format', (A(as, 'NameID', 'Format') || '').replace(/urn:oasis:names:tc:SAML:[\d.]+:nameid-format:/, '') || undefined],
        ['SubjectConfirmation', A(as, 'SubjectConfirmation', 'Method') ? A(as, 'SubjectConfirmation', 'Method').replace('urn:oasis:names:tc:SAML:2.0:cm:', '') : undefined],
        ['Recipient', A(as, 'SubjectConfirmationData', 'Recipient')],
        ['InResponseTo', A(as, 'SubjectConfirmationData', 'InResponseTo')],
        ['Conditions', nb || noa ? `${nb || '—'} → ${noa || '—'}` : undefined, ''],
        [t('validityLabel'), nb || noa ? tstat : undefined, tcls],
        ['Audience', T(as, 'Audience')],
        ['AuthnInstant', A(as, 'AuthnStatement', 'AuthnInstant')],
        ['AuthnContextClassRef', (T(as, 'AuthnContextClassRef') || '').replace('urn:oasis:names:tc:SAML:2.0:ac:classes:', '') || undefined],
        ['SessionIndex', A(as, 'AuthnStatement', 'SessionIndex')],
        [t('signAlgLabel'), sigMethod ? sigMethod.replace(/^.*[#]/, '') : t('noSignature')],
        [t('digestAlgLabel'), A(as, 'DigestMethod', 'Algorithm') ? A(as, 'DigestMethod', 'Algorithm').replace(/^.*[#]/, '') : undefined],
      ].filter((r) => r[1] !== null && r[1] !== undefined)

      const attrs = []
      for (const at of Array.from(as.getElementsByTagNameNS('*', 'Attribute'))) {
        const name = at.getAttribute('Name')
        const vals = Array.from(at.getElementsByTagNameNS('*', 'AttributeValue')).map((v) => v.textContent.trim())
        attrs.push([name, vals.join(', ')])
      }
      assertions.push({ rows, attrs })
    }

    result.value = { response: responseRows, assertions }
  } catch (e) {
    error.value = t('parseFailPrefix') + (e.message || t('parseFailDefault'))
  }
}
</script>

<style scoped src="./tool-style.css"></style>
