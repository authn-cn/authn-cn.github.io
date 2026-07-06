<template>
  <div class="authn-tool">
    <label class="authn-label">{{ t('inputLabel') }}</label>
    <textarea v-model="input" class="authn-textarea" rows="6" spellcheck="false"
      placeholder="-----BEGIN CERTIFICATE-----&#10;MIID...&#10;-----END CERTIFICATE-----" @input="parse"></textarea>
    <p v-if="error" class="authn-error">{{ error }}</p>

    <template v-if="fields.length">
      <table class="authn-table">
        <tbody>
          <tr v-for="f in fields" :key="f[0]">
            <td style="white-space:nowrap"><strong>{{ f[0] }}</strong></td>
            <td style="word-break:break-all">{{ f[1] }}</td>
          </tr>
        </tbody>
      </table>
      <p class="authn-note">{{ t('localNoteBefore') }} <code>&lt;X509Certificate&gt;</code>{{ t('localNoteAfter') }}</p>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { parseCertificate } from './x509.js'
import { useT } from './i18n.js'

const messages = {
  zh: {
    inputLabel: 'X.509 证书（PEM,或纯 base64 DER）',
    localNoteBefore: '纯浏览器本地解析 ASN.1,证书不上传。SAML Metadata 里的',
    localNoteAfter: '即为此格式(base64 DER)。',
    fieldVersion: '版本',
    fieldSerial: '序列号',
    fieldSubject: '主体 Subject',
    fieldIssuer: '颁发者 Issuer',
    fieldNotBefore: '有效期起',
    fieldNotAfter: '有效期止',
    validityExpired: '⚠ 已过期',
    validityNotYet: '⚠ 尚未生效',
    validityValid: '✔ 在有效期内',
    fieldPubAlg: '公钥算法',
    fieldSigAlg: '签名算法',
    fieldSha1: 'SHA-1 指纹',
    fieldSha256: 'SHA-256 指纹',
    errParseFailed: '解析失败：不是合法的 X.509 DER 结构。',
  },
  en: {
    inputLabel: 'X.509 certificate (PEM, or raw base64 DER)',
    localNoteBefore: 'ASN.1 is parsed locally in the browser; the certificate is never uploaded. The',
    localNoteAfter: 'element in SAML metadata uses this same format (base64 DER).',
    fieldVersion: 'Version',
    fieldSerial: 'Serial number',
    fieldSubject: 'Subject',
    fieldIssuer: 'Issuer',
    fieldNotBefore: 'Valid from',
    fieldNotAfter: 'Valid until',
    validityExpired: '⚠ Expired',
    validityNotYet: '⚠ Not yet valid',
    validityValid: '✔ Currently valid',
    fieldPubAlg: 'Public key algorithm',
    fieldSigAlg: 'Signature algorithm',
    fieldSha1: 'SHA-1 fingerprint',
    fieldSha256: 'SHA-256 fingerprint',
    errParseFailed: 'Parsing failed: not a valid X.509 DER structure.',
  },
  de: {
    inputLabel: 'X.509-Zertifikat (PEM oder reines base64-DER)',
    localNoteBefore: 'ASN.1 wird lokal im Browser geparst, das Zertifikat wird nicht hochgeladen. Das Element',
    localNoteAfter: 'in SAML-Metadaten verwendet genau dieses Format (base64-DER).',
    fieldVersion: 'Version',
    fieldSerial: 'Seriennummer',
    fieldSubject: 'Subjekt',
    fieldIssuer: 'Aussteller',
    fieldNotBefore: 'Gültig ab',
    fieldNotAfter: 'Gültig bis',
    validityExpired: '⚠ Abgelaufen',
    validityNotYet: '⚠ Noch nicht gültig',
    validityValid: '✔ Aktuell gültig',
    fieldPubAlg: 'Algorithmus des öffentlichen Schlüssels',
    fieldSigAlg: 'Signaturalgorithmus',
    fieldSha1: 'SHA-1-Fingerabdruck',
    fieldSha256: 'SHA-256-Fingerabdruck',
    errParseFailed: 'Parsing fehlgeschlagen: keine gültige X.509-DER-Struktur.',
  },
}
const t = useT(messages)

const input = ref('')
const error = ref('')
const fields = ref([])

async function parse() {
  error.value = ''
  fields.value = []
  if (!input.value.trim()) return
  try {
    const c = await parseCertificate(input.value)
    fields.value = [
      [t('fieldVersion'), 'v' + c.version],
      [t('fieldSerial'), c.serialHex],
      [t('fieldSubject'), c.subject],
      [t('fieldIssuer'), c.issuer],
      [t('fieldNotBefore'), c.notBefore.str],
      [t('fieldNotAfter'), c.notAfter.str + (c.expired ? `  ${t('validityExpired')}` : c.notYet ? `  ${t('validityNotYet')}` : `  ${t('validityValid')}`)],
      [t('fieldPubAlg'), c.pubAlg],
      [t('fieldSigAlg'), c.sigAlg],
      [t('fieldSha1'), c.sha1Hex],
      [t('fieldSha256'), c.sha256Hex],
    ]
  } catch (e) {
    error.value = t('errParseFailed') + (e.message ? `(${e.message})` : '')
  }
}
</script>

<style scoped src="./tool-style.css"></style>
