/**
 * 浏览器端 X.509 证书 ASN.1 DER 解析(供 CertViewer 与 SAML Metadata 解析器复用)。
 * 已与 openssl 逐字段对照一致。
 */

const OIDS = {
  '2.5.4.3': 'CN', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST', '2.5.4.10': 'O', '2.5.4.11': 'OU',
  '1.2.840.113549.1.9.1': 'E',
  '1.2.840.113549.1.1.1': 'RSA', '1.2.840.10045.2.1': 'EC',
  '1.2.840.113549.1.1.11': 'SHA256withRSA', '1.2.840.113549.1.1.12': 'SHA384withRSA',
  '1.2.840.113549.1.1.13': 'SHA512withRSA', '1.2.840.113549.1.1.5': 'SHA1withRSA',
  '1.2.840.10045.4.3.2': 'ecdsa-with-SHA256', '1.2.840.10045.4.3.3': 'ecdsa-with-SHA384',
}

export function pemToBytes(s) {
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
  const parts = [Math.floor(b[0] / 40) + '.' + (b[0] % 40)]
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
      rdns.push((OIDS[oid] || oid) + '=' + decodeStr(buf, kids[1]))
    }
  }
  return rdns.join(', ')
}
function parseTime(buf, node) {
  const s = decodeStr(buf, node)
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

/** 解析 X.509 证书(接受 PEM 或纯 base64 DER),返回展示用字段;失败抛错。 */
export async function parseCertificate(input) {
  const der = pemToBytes(input)
  const cert = readTLV(der, 0)
  const [tbs, sigAlg] = children(der, cert)
  const tk = children(der, tbs)
  let idx = 0
  let version = 1
  if (tk[0].tag === 0xa0) {
    version = der[children(der, tk[0])[0].start] + 1
    idx = 1
  }
  const serialHex = hex(der.slice(tk[idx].start, tk[idx].end))
  const issuer = parseName(der, tk[idx + 2])
  const validity = children(der, tk[idx + 3])
  const notBefore = parseTime(der, validity[0])
  const notAfter = parseTime(der, validity[1])
  const subject = parseName(der, tk[idx + 4])
  const spki = tk[idx + 5]
  const pkAlgOid = decodeOID(der, children(der, children(der, spki)[0])[0])
  const sigAlgOid = decodeOID(der, children(der, sigAlg)[0])
  const sha1 = new Uint8Array(await crypto.subtle.digest('SHA-1', der))
  const sha256 = new Uint8Array(await crypto.subtle.digest('SHA-256', der))
  const now = new Date()
  return {
    version,
    serialHex,
    subject,
    issuer,
    notBefore,
    notAfter,
    expired: now > notAfter.dt,
    notYet: now < notBefore.dt,
    pubAlg: OIDS[pkAlgOid] || pkAlgOid,
    sigAlg: OIDS[sigAlgOid] || sigAlgOid,
    sha1Hex: hex(sha1),
    sha256Hex: hex(sha256),
  }
}
