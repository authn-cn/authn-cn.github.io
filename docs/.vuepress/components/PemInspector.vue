<template>
  <div class="authn-tool">
    <label class="authn-label">{{ t('inputLabel') }}</label>
    <textarea v-model="input" class="authn-textarea" rows="9" spellcheck="false"
      placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----&#10;-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
      @input="parse"></textarea>
    <p v-if="error" class="authn-error">{{ error }}</p>

    <div v-for="(b, i) in blocks" :key="i" class="pem-card">
      <div class="pem-head">
        <span class="pem-badge">{{ b.label }}</span>
        <span class="pem-kind">{{ b.kind }}</span>
      </div>
      <table class="authn-table"><tbody>
        <tr v-for="f in b.fields" :key="f[0]">
          <td style="white-space:nowrap"><strong>{{ f[0] }}</strong></td>
          <td style="word-break:break-all">{{ f[1] }}</td>
        </tr>
      </tbody></table>
      <p v-if="b.hint" class="authn-note" style="margin:.4rem 0 0" v-html="b.hint"></p>
    </div>
    <p v-if="blocks.length" class="authn-note">
      {{ t('localNoteBefore') }} <a href="./cert.html">{{ t('x509LinkText') }}</a>{{ t('localNoteMid') }} <a href="./pem-to-jwk.html">{{ t('jwkLinkText') }}</a>{{ t('localNoteAfter') }}
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { pemToBytes, parseCertificate } from './x509.js'
import { useT } from './i18n.js'

const messages = {
  zh: {
    inputLabel: 'PEM 文本(可同时包含多个块,如证书链)',
    localNoteBefore: '本地解析,不上传。证书详情用',
    x509LinkText: 'X.509 解析',
    localNoteMid: ';密钥转 JWK 用',
    jwkLinkText: 'PEM → JWK',
    localNoteAfter: '。',
    kindCertificate: 'X.509 证书',
    kindCsr: 'PKCS#10 证书请求(CSR)',
    kindSpki: 'SPKI 公钥',
    kindPkcs8: 'PKCS#8 私钥',
    kindRsaPrivateLegacy: 'PKCS#1 RSA 私钥(旧式)',
    kindRsaPublicLegacy: 'PKCS#1 RSA 公钥(旧式)',
    kindEcPrivateLegacy: 'SEC1 EC 私钥(旧式)',
    kindEncryptedPkcs8: '加密的 PKCS#8 私钥',
    kindCrl: '证书吊销列表(CRL)',
    kindPkcs7: 'PKCS#7 容器',
    kindCms: 'CMS 消息',
    kindDhParams: 'Diffie-Hellman 参数',
    kindUnknown: '未知类型',
    kindDecodeFailed: '解码失败',
    fieldError: '错误',
    errBase64Decode: 'base64 无法解码',
    fieldDerLength: 'DER 长度',
    unitBytes: '字节',
    fieldSubject: '主体',
    fieldIssuer: '颁发者',
    fieldValidity: '有效期',
    validityExpired: '⚠ 已过期',
    validityNotYet: '⚠ 未生效',
    validityValid: '✔ 有效',
    fieldPubAlg: '公钥算法',
    fieldSigAlg: '签名算法',
    errCertParseFailed: '证书 ASN.1 解析失败:',
    hintLegacyKey: 'WebCrypto 不支持旧式格式,转 PKCS#8:',
    errNoPemBlocks: '未找到 PEM 块(应形如 -----BEGIN ...----- / -----END ...-----)。',
    fieldAlgorithm: '算法',
    algNotRecognized: '无法通过 WebCrypto 识别(可能是 Ed25519 等)',
  },
  en: {
    inputLabel: 'PEM text (may contain multiple blocks, e.g. a certificate chain)',
    localNoteBefore: 'Parsed locally, nothing is uploaded. For certificate details use',
    x509LinkText: 'X.509 Parser',
    localNoteMid: '; to convert a key to JWK use',
    jwkLinkText: 'PEM → JWK',
    localNoteAfter: '.',
    kindCertificate: 'X.509 certificate',
    kindCsr: 'PKCS#10 certificate request (CSR)',
    kindSpki: 'SPKI public key',
    kindPkcs8: 'PKCS#8 private key',
    kindRsaPrivateLegacy: 'PKCS#1 RSA private key (legacy)',
    kindRsaPublicLegacy: 'PKCS#1 RSA public key (legacy)',
    kindEcPrivateLegacy: 'SEC1 EC private key (legacy)',
    kindEncryptedPkcs8: 'Encrypted PKCS#8 private key',
    kindCrl: 'Certificate Revocation List (CRL)',
    kindPkcs7: 'PKCS#7 container',
    kindCms: 'CMS message',
    kindDhParams: 'Diffie-Hellman parameters',
    kindUnknown: 'Unknown type',
    kindDecodeFailed: 'Decode failed',
    fieldError: 'Error',
    errBase64Decode: 'Unable to decode base64',
    fieldDerLength: 'DER length',
    unitBytes: 'bytes',
    fieldSubject: 'Subject',
    fieldIssuer: 'Issuer',
    fieldValidity: 'Validity',
    validityExpired: '⚠ Expired',
    validityNotYet: '⚠ Not yet valid',
    validityValid: '✔ Valid',
    fieldPubAlg: 'Public key algorithm',
    fieldSigAlg: 'Signature algorithm',
    errCertParseFailed: 'Certificate ASN.1 parsing failed: ',
    hintLegacyKey: 'WebCrypto does not support the legacy format; convert to PKCS#8: ',
    errNoPemBlocks: 'No PEM block found (should look like -----BEGIN ...----- / -----END ...-----).',
    fieldAlgorithm: 'Algorithm',
    algNotRecognized: 'Not recognized via WebCrypto (may be Ed25519 etc.)',
  },
  de: {
    inputLabel: 'PEM-Text (kann mehrere Blöcke enthalten, z. B. eine Zertifikatskette)',
    localNoteBefore: 'Lokal geparst, nichts wird hochgeladen. Für Zertifikatsdetails',
    x509LinkText: 'X.509-Parser',
    localNoteMid: 'verwenden; zur Umwandlung eines Schlüssels in JWK',
    jwkLinkText: 'PEM → JWK',
    localNoteAfter: 'verwenden.',
    kindCertificate: 'X.509-Zertifikat',
    kindCsr: 'PKCS#10-Zertifikatsanforderung (CSR)',
    kindSpki: 'SPKI-Öffentlicher Schlüssel',
    kindPkcs8: 'PKCS#8-Privater Schlüssel',
    kindRsaPrivateLegacy: 'PKCS#1 RSA privater Schlüssel (veraltet)',
    kindRsaPublicLegacy: 'PKCS#1 RSA öffentlicher Schlüssel (veraltet)',
    kindEcPrivateLegacy: 'SEC1 EC privater Schlüssel (veraltet)',
    kindEncryptedPkcs8: 'Verschlüsselter PKCS#8-Privater Schlüssel',
    kindCrl: 'Zertifikatssperrliste (CRL)',
    kindPkcs7: 'PKCS#7-Container',
    kindCms: 'CMS-Nachricht',
    kindDhParams: 'Diffie-Hellman-Parameter',
    kindUnknown: 'Unbekannter Typ',
    kindDecodeFailed: 'Dekodierung fehlgeschlagen',
    fieldError: 'Fehler',
    errBase64Decode: 'Base64 kann nicht dekodiert werden',
    fieldDerLength: 'DER-Länge',
    unitBytes: 'Bytes',
    fieldSubject: 'Subjekt',
    fieldIssuer: 'Aussteller',
    fieldValidity: 'Gültigkeit',
    validityExpired: '⚠ Abgelaufen',
    validityNotYet: '⚠ Noch nicht gültig',
    validityValid: '✔ Gültig',
    fieldPubAlg: 'Algorithmus des öffentlichen Schlüssels',
    fieldSigAlg: 'Signaturalgorithmus',
    errCertParseFailed: 'ASN.1-Parsing des Zertifikats fehlgeschlagen: ',
    hintLegacyKey: 'WebCrypto unterstützt das veraltete Format nicht, in PKCS#8 umwandeln: ',
    errNoPemBlocks: 'Kein PEM-Block gefunden (sollte wie -----BEGIN ...----- / -----END ...----- aussehen).',
    fieldAlgorithm: 'Algorithmus',
    algNotRecognized: 'Über WebCrypto nicht erkennbar (evtl. Ed25519 o. Ä.)',
  },
}
const t = useT(messages)

const input = ref('')
const error = ref('')
const blocks = ref([])

function kindFor(label) {
  const KIND = {
    'CERTIFICATE': t('kindCertificate'),
    'CERTIFICATE REQUEST': t('kindCsr'),
    'NEW CERTIFICATE REQUEST': t('kindCsr'),
    'PUBLIC KEY': t('kindSpki'),
    'PRIVATE KEY': t('kindPkcs8'),
    'RSA PRIVATE KEY': t('kindRsaPrivateLegacy'),
    'RSA PUBLIC KEY': t('kindRsaPublicLegacy'),
    'EC PRIVATE KEY': t('kindEcPrivateLegacy'),
    'ENCRYPTED PRIVATE KEY': t('kindEncryptedPkcs8'),
    'X509 CRL': t('kindCrl'),
    'PKCS7': t('kindPkcs7'),
    'CMS': t('kindCms'),
    'DH PARAMETERS': t('kindDhParams'),
  }
  return KIND[label] || t('kindUnknown')
}
const EC_ALGS = [
  { params: { name: 'ECDSA', namedCurve: 'P-256' } },
  { params: { name: 'ECDSA', namedCurve: 'P-384' } },
  { params: { name: 'ECDSA', namedCurve: 'P-521' } },
]

async function keyDetails(format, bytes, usages) {
  // 先试 RSA,再逐个 EC 曲线
  try {
    const k = await crypto.subtle.importKey(format, bytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, true, usages)
    return [t('fieldAlgorithm'), `RSA · ${k.algorithm.modulusLength} bit · e=${bigE(k.algorithm.publicExponent)}`]
  } catch { /* not RSA */ }
  for (const a of EC_ALGS) {
    try {
      const k = await crypto.subtle.importKey(format, bytes, a.params, true, usages)
      return [t('fieldAlgorithm'), `EC · ${k.algorithm.namedCurve}`]
    } catch { /* try next */ }
  }
  return [t('fieldAlgorithm'), t('algNotRecognized')]
}
function bigE(buf) {
  if (!buf) return '?'
  let v = 0
  for (const b of new Uint8Array(buf)) v = v * 256 + b
  return v
}

async function parse() {
  error.value = ''
  blocks.value = []
  const text = input.value
  if (!text.trim()) return
  const re = /-----BEGIN ([A-Z0-9 ]+?)-----([\s\S]*?)-----END \1-----/g
  const out = []
  let m
  while ((m = re.exec(text)) !== null) {
    const label = m[1].trim()
    const pem = m[0]
    let bytes
    try { bytes = pemToBytes(pem) } catch { out.push({ label, kind: t('kindDecodeFailed'), fields: [[t('fieldError'), t('errBase64Decode')]] }); continue }
    const fields = [[t('fieldDerLength'), bytes.length + ' ' + t('unitBytes')]]
    let hint = ''

    if (label === 'CERTIFICATE') {
      try {
        const c = await parseCertificate(pem)
        fields.push([t('fieldSubject'), c.subject], [t('fieldIssuer'), c.issuer],
          [t('fieldValidity'), `${c.notBefore.str} → ${c.notAfter.str}` + (c.expired ? `  ${t('validityExpired')}` : c.notYet ? `  ${t('validityNotYet')}` : `  ${t('validityValid')}`)],
          [t('fieldPubAlg'), c.pubAlg], [t('fieldSigAlg'), c.sigAlg], ['SHA-256', c.sha256Hex])
      } catch (e) { hint = t('errCertParseFailed') + (e.message || e) }
    } else if (label === 'PUBLIC KEY') {
      fields.push(await keyDetails('spki', bytes, ['verify']))
    } else if (label === 'PRIVATE KEY') {
      fields.push(await keyDetails('pkcs8', bytes, ['sign']))
    } else if (label === 'RSA PRIVATE KEY' || label === 'EC PRIVATE KEY') {
      hint = t('hintLegacyKey') + '<code>openssl pkcs8 -topk8 -nocrypt -in key.pem</code>'
    }
    out.push({ label, kind: kindFor(label), fields, hint })
  }
  if (!out.length) error.value = t('errNoPemBlocks')
  blocks.value = out
}
</script>

<style scoped>
.pem-card { border: 1px solid var(--vp-c-border, #dcdfe6); border-radius: 8px; padding: .8rem 1rem; margin-top: 1rem; }
.pem-head { display: flex; align-items: baseline; gap: .6rem; margin-bottom: .5rem; }
.pem-badge { font-family: var(--font-family-mono, monospace); font-size: .8rem; font-weight: 700; padding: .1rem .5rem; border-radius: 4px; background: var(--vp-c-brand-soft, #e8f0fe); color: var(--vp-c-brand, #3451b2); }
.pem-kind { color: var(--vp-c-text-2, #666); font-size: .9rem; }
</style>
<style scoped src="./tool-style.css"></style>
