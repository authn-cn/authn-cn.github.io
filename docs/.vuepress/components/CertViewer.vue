<template>
  <div class="authn-tool">
    <label class="authn-label">X.509 证书（PEM,或纯 base64 DER）</label>
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
      <p class="authn-note">纯浏览器本地解析 ASN.1,证书不上传。SAML Metadata 里的 <code>&lt;X509Certificate&gt;</code> 即为此格式(base64 DER)。</p>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const input = ref('')
const error = ref('')
const fields = ref([])

const OIDS = {
  '2.5.4.3': 'CN', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST', '2.5.4.10': 'O', '2.5.4.11': 'OU',
  '1.2.840.113549.1.9.1': 'E',
  '1.2.840.113549.1.1.1': 'RSA', '1.2.840.10045.2.1': 'EC',
  '1.2.840.113549.1.1.11': 'SHA256withRSA', '1.2.840.113549.1.1.12': 'SHA384withRSA',
  '1.2.840.113549.1.1.13': 'SHA512withRSA', '1.2.840.113549.1.1.5': 'SHA1withRSA',
  '1.2.840.10045.4.3.2': 'ecdsa-with-SHA256', '1.2.840.10045.4.3.3': 'ecdsa-with-SHA384',
}

function pemToBytes(s) {
  const t = s.trim()
  const b64 = /-----BEGIN/.test(t) ? t.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '') : t.replace(/\s+/g, '')
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function readTLV(buf, pos) {
  const tag = buf[pos]
  let len = buf[pos + 1]
  let hdr = 2
  if (len & 0x80) {
    const n = len & 0x7f
    len = 0
    for (let i = 0; i < n; i++) len = len * 256 + buf[pos + 2 + i]
    hdr = 2 + n
  }
  const start = pos + hdr
  return { tag, start, end: start + len }
}
function children(buf, node) {
  const out = []
  let p = node.start
  while (p < node.end) {
    const t = readTLV(buf, p)
    out.push(t)
    p = t.end
  }
  return out
}
function decodeOID(buf, node) {
  const b = buf.slice(node.start, node.end)
  const first = Math.floor(b[0] / 40) + '.' + (b[0] % 40)
  const parts = [first]
  let val = 0
  for (let i = 1; i < b.length; i++) {
    val = val * 128 + (b[i] & 0x7f)
    if (!(b[i] & 0x80)) { parts.push(val); val = 0 }
  }
  return parts.join('.')
}
function decodeStr(buf, node) {
  return new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(node.start, node.end))
}
function parseName(buf, nameNode) {
  const rdns = []
  for (const rdn of children(buf, nameNode)) {
    for (const atv of children(buf, rdn)) {
      const kids = children(buf, atv)
      const oid = decodeOID(buf, kids[0])
      const label = OIDS[oid] || oid
      rdns.push(label + '=' + decodeStr(buf, kids[1]))
    }
  }
  return rdns.join(', ')
}
function parseTime(buf, node) {
  const s = decodeStr(buf, node)
  // UTCTime YYMMDDHHMMSSZ (tag 0x17) 或 GeneralizedTime YYYYMMDD... (0x18)
  let y, rest
  if (node.tag === 0x17) {
    const yy = parseInt(s.slice(0, 2), 10)
    y = yy >= 50 ? 1900 + yy : 2000 + yy
    rest = s.slice(2)
  } else {
    y = parseInt(s.slice(0, 4), 10)
    rest = s.slice(4)
  }
  const mo = rest.slice(0, 2), d = rest.slice(2, 4), h = rest.slice(4, 6), mi = rest.slice(6, 8), se = rest.slice(8, 10)
  const dt = new Date(Date.UTC(y, +mo - 1, +d, +h, +mi, +se || 0))
  return { dt, str: `${y}-${mo}-${d} ${h}:${mi}:${se} UTC` }
}
function hex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(':').toUpperCase()
}

async function parse() {
  error.value = ''
  fields.value = []
  if (!input.value.trim()) return
  let der
  try { der = pemToBytes(input.value) } catch { error.value = 'Base64 解码失败。'; return }
  try {
    const cert = readTLV(der, 0)
    const [tbs, sigAlg] = children(der, cert)
    const tbsKids = children(der, tbs)
    let idx = 0
    let version = 1
    if (tbsKids[0].tag === 0xa0) {
      const vNode = children(der, tbsKids[0])[0]
      version = der[vNode.start] + 1
      idx = 1
    }
    const serialNode = tbsKids[idx]
    const serial = hex(der.slice(serialNode.start, serialNode.end))
    const issuer = parseName(der, tbsKids[idx + 2])
    const validity = children(der, tbsKids[idx + 3])
    const notBefore = parseTime(der, validity[0])
    const notAfter = parseTime(der, validity[1])
    const subject = parseName(der, tbsKids[idx + 4])
    const spki = tbsKids[idx + 5]
    const spkiAlg = children(der, children(der, spki)[0])[0]
    const pkAlgOid = decodeOID(der, spkiAlg)
    const sigAlgOid = decodeOID(der, children(der, sigAlg)[0])

    const now = new Date()
    const expired = now > notAfter.dt
    const notYet = now < notBefore.dt

    const sha1 = new Uint8Array(await crypto.subtle.digest('SHA-1', der))
    const sha256 = new Uint8Array(await crypto.subtle.digest('SHA-256', der))

    fields.value = [
      ['版本', 'v' + version],
      ['序列号', serial],
      ['主体 Subject', subject],
      ['颁发者 Issuer', issuer],
      ['有效期起', notBefore.str],
      ['有效期止', notAfter.str + (expired ? '  ⚠ 已过期' : notYet ? '  ⚠ 尚未生效' : '  ✔ 在有效期内')],
      ['公钥算法', OIDS[pkAlgOid] || pkAlgOid],
      ['签名算法', OIDS[sigAlgOid] || sigAlgOid],
      ['SHA-1 指纹', hex(sha1)],
      ['SHA-256 指纹', hex(sha256)],
    ]
  } catch (e) {
    error.value = '解析失败：不是合法的 X.509 DER 结构。' + (e.message ? `(${e.message})` : '')
  }
}
</script>

<style scoped src="./tool-style.css"></style>
