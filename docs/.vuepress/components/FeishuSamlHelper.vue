<template>
  <div class="authn-tool">
    <div class="authn-tabs">
      <button class="authn-tab" :class="{ active: mode === 'parse' }" @click="mode = 'parse'">{{ t('tabParse') }}</button>
      <button class="authn-tab" :class="{ active: mode === 'gen' }" @click="mode = 'gen'">{{ t('tabGen') }}</button>
    </div>

    <!-- ============ 模式 A:解析 IdP metadata → 飞书填写字段 ============ -->
    <template v-if="mode === 'parse'">
      <label class="authn-label">{{ t('idpXmlLabel') }}</label>
      <textarea v-model="idpXml" class="authn-textarea" rows="8" spellcheck="false"
        :placeholder="t('idpXmlPlaceholder')" @input="parseIdp"></textarea>
      <p v-if="parseErr" class="authn-error">{{ parseErr }}</p>

      <div v-if="parsed" class="fs-card">
        <p class="authn-note" v-html="t('parseIntro')"></p>
        <table class="authn-table fs-fill"><tbody>
          <tr>
            <td class="fs-k">{{ t('kIssuer') }}</td>
            <td class="fs-v">{{ parsed.entityId || '—' }}</td>
            <td class="fs-c"><button v-if="parsed.entityId" class="authn-btn secondary fs-copy" @click="copy(parsed.entityId, 'issuer')">{{ copied === 'issuer' ? t('copied') : t('copy') }}</button></td>
          </tr>
          <tr>
            <td class="fs-k">{{ t('kLoginUrl') }}</td>
            <td class="fs-v">{{ parsed.ssoUrl || '—' }}<span v-if="parsed.ssoBinding" class="authn-note">（{{ parsed.ssoBinding }}）</span></td>
            <td class="fs-c"><button v-if="parsed.ssoUrl" class="authn-btn secondary fs-copy" @click="copy(parsed.ssoUrl, 'sso')">{{ copied === 'sso' ? t('copied') : t('copy') }}</button></td>
          </tr>
          <tr v-if="parsed.sloUrl">
            <td class="fs-k">{{ t('kLogoutUrl') }}</td>
            <td class="fs-v">{{ parsed.sloUrl }}<span v-if="parsed.sloBinding" class="authn-note">（{{ parsed.sloBinding }}）</span></td>
            <td class="fs-c"><button class="authn-btn secondary fs-copy" @click="copy(parsed.sloUrl, 'slo')">{{ copied === 'slo' ? t('copied') : t('copy') }}</button></td>
          </tr>
          <tr>
            <td class="fs-k">{{ t('kNameId') }}</td>
            <td class="fs-v" colspan="2">{{ parsed.nameIdFormats.length ? parsed.nameIdFormats.join('、') : t('nameIdNone') }}</td>
          </tr>
        </tbody></table>

        <template v-for="(c, i) in parsed.certs" :key="i">
          <label class="authn-label fs-certlabel">{{ t('kCert') }} <span v-if="parsed.certs.length > 1">#{{ i + 1 }}</span>
            <span v-if="c.use" class="authn-note">（use={{ c.use }}）</span></label>
          <p class="authn-note" v-html="t('certHint')"></p>
          <pre class="authn-pre">{{ c.b64 }}</pre>
          <button class="authn-btn secondary" @click="copy(c.b64, 'cert' + i)">{{ copied === 'cert' + i ? t('copied') : t('copyCertStripped') }}</button>
          <table v-if="c.info" class="authn-table fs-certinfo"><tbody>
            <tr><td>Subject</td><td>{{ c.info.subject }}</td></tr>
            <tr><td>{{ t('validity') }}</td><td>{{ c.info.notBefore.str }} → {{ c.info.notAfter.str }}
              <span :class="c.info.expired ? 'authn-bad' : 'authn-ok'">{{ c.info.expired ? t('expired') : c.info.notYet ? t('notYet') : t('valid') }}</span></td></tr>
            <tr><td>SHA-256</td><td>{{ c.info.sha256Hex }}</td></tr>
          </tbody></table>
          <p v-else-if="c.err" class="authn-error">{{ c.err }}</p>
        </template>

        <p class="authn-note fs-warn" v-html="t('parseWarn')"></p>
      </div>
    </template>

    <!-- ============ 模式 B:生成飞书 SP metadata ============ -->
    <template v-else>
      <p class="authn-note" v-html="t('genIntro')"></p>
      <div class="authn-row">
        <div class="authn-field">
          <label class="authn-label">{{ t('fRegion') }}</label>
          <select v-model="region" class="authn-select" @change="applyRegion">
            <option v-for="r in regionOptions" :key="r.key" :value="r.key">{{ r.label }}</option>
          </select>
        </div>
      </div>
      <p class="authn-note fs-warn" v-html="t('emailAttrNote')"></p>
      <div class="authn-row">
        <div class="authn-field">
          <label class="authn-label">{{ t('fEntityId') }}</label>
          <input v-model.trim="spEntityId" class="authn-input" :placeholder="t('fEntityIdPh')" @input="region = 'custom'" />
        </div>
        <div class="authn-field">
          <label class="authn-label">{{ t('fAcs') }}</label>
          <input v-model.trim="acsUrl" class="authn-input" :placeholder="t('fAcsPh')" @input="region = 'custom'" />
        </div>
      </div>
      <div class="authn-row">
        <div class="authn-field">
          <label class="authn-label">{{ t('fSlo') }}</label>
          <input v-model.trim="sloUrl" class="authn-input" :placeholder="t('fSloPh')" />
        </div>
        <div class="authn-field">
          <label class="authn-label">{{ t('fNameId') }}</label>
          <select v-model="nameIdFormat" class="authn-select">
            <option v-for="o in nameIdOptions" :key="o.urn" :value="o.urn">{{ o.label }}</option>
          </select>
        </div>
      </div>
      <div class="authn-row">
        <label class="fs-check"><input type="checkbox" v-model="wantAssertionsSigned" /> WantAssertionsSigned</label>
        <label class="fs-check"><input type="checkbox" v-model="authnRequestsSigned" /> AuthnRequestsSigned</label>
        <label class="fs-check"><input type="checkbox" v-model="requestEmail" /> {{ t('fRequestEmail') }}</label>
      </div>
      <label class="authn-label">{{ t('fCert') }} <span class="authn-note">{{ t('optional') }}</span></label>
      <textarea v-model="spCertPem" class="authn-textarea" rows="5" spellcheck="false"
        :placeholder="t('fCertPh')"></textarea>

      <p v-if="genError" class="authn-error">{{ genError }}</p>
      <template v-if="genXml">
        <label class="authn-label fs-outlabel">{{ t('outLabel') }}</label>
        <pre class="authn-pre">{{ genXml }}</pre>
        <button class="authn-btn" @click="copy(genXml, 'xml')">{{ copied === 'xml' ? t('copied') : t('copyXml') }}</button>
        <button class="authn-btn secondary" @click="download">{{ t('downloadXml') }}</button>
        <p class="authn-note fs-warn" v-html="t('genWarn')"></p>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { parseCertificate } from './x509.js'
import { useT } from './i18n.js'

const messages = {
  zh: {
    tabParse: '解析 IdP Metadata → 飞书字段',
    tabGen: '生成飞书 SP Metadata',
    idpXmlLabel: 'IdP Metadata XML',
    idpXmlPlaceholder: '粘贴身份提供方(Okta / Entra ID / ADFS / IDaaS)导出的 EntityDescriptor XML',
    parseIntro: '飞书 <strong>不支持上传 IdP metadata</strong>,只能手工填字段。下面是从这份 metadata 中提取、需逐项粘贴到<strong>飞书管理后台 → 企业设置 → SSO 账号登录</strong>的内容:',
    kIssuer: 'IdP Issuer / Entity ID',
    kLoginUrl: '登录地址(SSO URL)',
    kLogoutUrl: '登出地址(SLO URL)',
    kNameId: 'NameID 格式',
    kCert: '签名证书(Public Certificate)',
    nameIdNone: '(metadata 未声明,飞书侧通常用 email / 登录名匹配用户)',
    certHint: '飞书的 <strong>Public Certificate</strong> 只要证书本体的 base64,<strong>不要</strong> <code>-----BEGIN/END CERTIFICATE-----</code> 头尾。下面已为你去掉:',
    copyCertStripped: '复制(已去头尾)',
    validity: '有效期',
    expired: '已过期',
    notYet: '尚未生效',
    valid: '有效',
    parseWarn: '⚠️ 飞书里证书是<strong>写死</strong>的:当 IdP 轮换签名证书时,必须回飞书手动更新此处,否则登录会突然失败。纯浏览器本地解析,不上传。',
    copy: '复制',
    copied: '已复制 ✓',
    genIntro: '飞书 / Lark 的 SP 参数是<strong>按区域固定</strong>的(与你的企业无关)。选好区域即自动填好,生成的标准 SP metadata 可上传到 Okta / Entra ID 等<strong>支持导入 metadata</strong> 的 IdP;飞书本身不吃 metadata,直接照下面的值填进 IdP 即可。',
    fRegion: '飞书 / Lark 区域(自动填入固定 SP 参数)',
    regionFeishu: '飞书(中国 feishu.cn)',
    regionLark: 'Lark(国际 larksuite.com)',
    regionSg: 'Lark(新加坡 sg.larksuite.com)',
    regionJp: 'Lark(日本 jp.larksuite.com)',
    regionCustom: '自定义',
    emailAttrNote: '⚠️ 飞书按<strong>邮箱</strong>匹配成员:必须在 IdP 侧让断言包含 <code>email</code> 属性(值为用户邮箱),且与飞书成员邮箱一致。企业域名(<code>xxx.feishu.cn</code>)只在员工登录时输入,不出现在这些 SP 参数里。',
    fRequestEmail: 'metadata 声明 email 属性',
    fEntityId: 'SP Entity ID(Audience URI)',
    fEntityIdPh: '按区域固定,如 https://www.feishu.cn',
    fAcs: 'ACS URL(Single Sign-On URL) *',
    fAcsPh: '按区域固定的 call_back 地址',
    fSlo: '登出地址 SLO URL',
    fSloPh: '可选,留空则不写入',
    fNameId: 'NameIDFormat',
    fCert: 'SP 签名证书(PEM)',
    fCertPh: '可选。若 IdP 要求 SP 对 AuthnRequest 签名 / 加密断言,粘贴 SP 证书 PEM',
    optional: '(可选)',
    outLabel: '飞书 SP Metadata(可上传到 IdP)',
    copyXml: '复制 XML',
    downloadXml: '下载 .xml',
    genWarn: '此 metadata 由你填入的参数拼装,请核对 ACS URL 与 Entity ID 与飞书控制台完全一致。全部在浏览器本地生成,不上传。',
    needAcs: '请至少填写 ACS URL。',
    parseXmlErr: 'XML 解析失败:',
    noIdp: '未找到 IdP(IDPSSODescriptor)。请确认这是身份提供方的 metadata。',
    certErr: '证书解析失败:',
    niEmail: 'emailAddress(邮箱)',
    niUnspec: 'unspecified(未指定)',
    niPersistent: 'persistent(持久)',
    niTransient: 'transient(临时)',
  },
  en: {
    tabParse: 'Parse IdP Metadata → Feishu Fields',
    tabGen: 'Generate Feishu SP Metadata',
    idpXmlLabel: 'IdP Metadata XML',
    idpXmlPlaceholder: 'Paste the EntityDescriptor XML exported by your IdP (Okta / Entra ID / ADFS / IDaaS)',
    parseIntro: 'Feishu <strong>cannot import IdP metadata</strong> — you must enter fields by hand. Below are the values extracted from this metadata to paste into <strong>Feishu Admin → Company Settings → SSO Login</strong>:',
    kIssuer: 'IdP Issuer / Entity ID',
    kLoginUrl: 'Login URL (SSO URL)',
    kLogoutUrl: 'Logout URL (SLO URL)',
    kNameId: 'NameID Format',
    kCert: 'Signing Certificate (Public Certificate)',
    nameIdNone: '(not declared in metadata; Feishu usually matches users by email / login name)',
    certHint: 'Feishu\'s <strong>Public Certificate</strong> field wants only the base64 body, <strong>without</strong> the <code>-----BEGIN/END CERTIFICATE-----</code> markers. Stripped for you below:',
    copyCertStripped: 'Copy (markers stripped)',
    validity: 'Validity',
    expired: 'Expired',
    notYet: 'Not yet valid',
    valid: 'Valid',
    parseWarn: '⚠️ The certificate is <strong>hard-coded</strong> in Feishu: when the IdP rotates its signing certificate you must update it here manually, or logins will suddenly fail. Parsed locally in your browser; nothing is uploaded.',
    copy: 'Copy',
    copied: 'Copied ✓',
    genIntro: 'Feishu / Lark SP parameters are <strong>fixed per region</strong> (not per tenant). Pick a region and they fill in automatically; the resulting standard SP metadata can be uploaded to IdPs that <strong>support metadata import</strong> (Okta / Entra ID). Feishu itself doesn\'t import metadata — just type the values below into your IdP.',
    fRegion: 'Feishu / Lark region (auto-fills the fixed SP params)',
    regionFeishu: 'Feishu (China, feishu.cn)',
    regionLark: 'Lark (Global, larksuite.com)',
    regionSg: 'Lark (Singapore, sg.larksuite.com)',
    regionJp: 'Lark (Japan, jp.larksuite.com)',
    regionCustom: 'Custom',
    emailAttrNote: '⚠️ Feishu matches members by <strong>email</strong>: the IdP assertion must include an <code>email</code> attribute (the user\'s email), matching the member\'s Feishu email. The enterprise domain (<code>xxx.feishu.cn</code>) is only typed at login time and does not appear in these SP params.',
    fRequestEmail: 'Declare email attribute in metadata',
    fEntityId: 'SP Entity ID (Audience URI)',
    fEntityIdPh: 'Fixed per region, e.g. https://www.feishu.cn',
    fAcs: 'ACS URL (Single Sign-On URL) *',
    fAcsPh: 'The region-fixed call_back URL',
    fSlo: 'Logout URL (SLO)',
    fSloPh: 'Optional; leave empty to omit',
    fNameId: 'NameIDFormat',
    fCert: 'SP Signing Certificate (PEM)',
    fCertPh: 'Optional. If the IdP requires the SP to sign AuthnRequests / encrypt assertions, paste the SP certificate PEM',
    optional: '(optional)',
    outLabel: 'Feishu SP Metadata (upload to your IdP)',
    copyXml: 'Copy XML',
    downloadXml: 'Download .xml',
    genWarn: 'This metadata is assembled from the values you entered — verify the ACS URL and Entity ID match the Feishu console exactly. Generated entirely in your browser; nothing is uploaded.',
    needAcs: 'Please enter at least the ACS URL.',
    parseXmlErr: 'XML parsing failed: ',
    noIdp: 'No IdP (IDPSSODescriptor) found. Make sure this is an identity provider\'s metadata.',
    certErr: 'Certificate parsing failed: ',
    niEmail: 'emailAddress',
    niUnspec: 'unspecified',
    niPersistent: 'persistent',
    niTransient: 'transient',
  },
  de: {
    tabParse: 'IdP-Metadata parsen → Feishu-Felder',
    tabGen: 'Feishu-SP-Metadata erzeugen',
    idpXmlLabel: 'IdP-Metadata-XML',
    idpXmlPlaceholder: 'Vom IdP (Okta / Entra ID / ADFS / IDaaS) exportiertes EntityDescriptor-XML einfügen',
    parseIntro: 'Feishu <strong>kann keine IdP-Metadata importieren</strong> — die Felder müssen manuell eingegeben werden. Unten stehen die aus dieser Metadata extrahierten Werte für <strong>Feishu-Admin → Unternehmenseinstellungen → SSO-Login</strong>:',
    kIssuer: 'IdP Issuer / Entity ID',
    kLoginUrl: 'Login-URL (SSO-URL)',
    kLogoutUrl: 'Logout-URL (SLO-URL)',
    kNameId: 'NameID-Format',
    kCert: 'Signaturzertifikat (Public Certificate)',
    nameIdNone: '(nicht in der Metadata deklariert; Feishu ordnet Benutzer meist per E-Mail / Login-Name zu)',
    certHint: 'Das Feld <strong>Public Certificate</strong> von Feishu erwartet nur den base64-Inhalt, <strong>ohne</strong> die <code>-----BEGIN/END CERTIFICATE-----</code>-Markierungen. Unten bereits entfernt:',
    copyCertStripped: 'Kopieren (ohne Markierungen)',
    validity: 'Gültigkeit',
    expired: 'Abgelaufen',
    notYet: 'Noch nicht gültig',
    valid: 'Gültig',
    parseWarn: '⚠️ Das Zertifikat ist in Feishu <strong>fest hinterlegt</strong>: Wenn der IdP sein Signaturzertifikat rotiert, muss es hier manuell aktualisiert werden, sonst schlagen Logins plötzlich fehl. Lokale Verarbeitung im Browser; nichts wird hochgeladen.',
    copy: 'Kopieren',
    copied: 'Kopiert ✓',
    genIntro: 'Die SP-Parameter von Feishu / Lark sind <strong>pro Region fest</strong> (nicht pro Mandant). Region wählen — die Werte werden automatisch eingetragen; die erzeugte standardkonforme SP-Metadata kann bei IdPs mit <strong>Metadata-Import</strong> (Okta / Entra ID) hochgeladen werden. Feishu selbst importiert keine Metadata — die Werte unten einfach in den IdP eintragen.',
    fRegion: 'Feishu-/Lark-Region (füllt die festen SP-Parameter aus)',
    regionFeishu: 'Feishu (China, feishu.cn)',
    regionLark: 'Lark (Global, larksuite.com)',
    regionSg: 'Lark (Singapur, sg.larksuite.com)',
    regionJp: 'Lark (Japan, jp.larksuite.com)',
    regionCustom: 'Benutzerdefiniert',
    emailAttrNote: '⚠️ Feishu ordnet Mitglieder per <strong>E-Mail</strong> zu: Die IdP-Assertion muss ein <code>email</code>-Attribut (die E-Mail des Benutzers) enthalten, das mit der Feishu-E-Mail des Mitglieds übereinstimmt. Die Unternehmensdomain (<code>xxx.feishu.cn</code>) wird nur beim Login eingegeben und taucht in diesen SP-Parametern nicht auf.',
    fRequestEmail: 'email-Attribut in Metadata deklarieren',
    fEntityId: 'SP Entity ID (Audience URI)',
    fEntityIdPh: 'Pro Region fest, z. B. https://www.feishu.cn',
    fAcs: 'ACS-URL (Single Sign-On URL) *',
    fAcsPh: 'Die pro Region feste call_back-URL',
    fSlo: 'Logout-URL (SLO)',
    fSloPh: 'Optional; leer lassen zum Weglassen',
    fNameId: 'NameIDFormat',
    fCert: 'SP-Signaturzertifikat (PEM)',
    fCertPh: 'Optional. Falls der IdP verlangt, dass der SP AuthnRequests signiert / Assertions verschlüsselt, das SP-Zertifikat-PEM einfügen',
    optional: '(optional)',
    outLabel: 'Feishu-SP-Metadata (beim IdP hochladen)',
    copyXml: 'XML kopieren',
    downloadXml: '.xml herunterladen',
    genWarn: 'Diese Metadata wird aus deinen Eingaben zusammengesetzt — prüfe, dass ACS-URL und Entity ID exakt mit der Feishu-Konsole übereinstimmen. Vollständig lokal im Browser erzeugt; nichts wird hochgeladen.',
    needAcs: 'Bitte mindestens die ACS-URL eingeben.',
    parseXmlErr: 'XML-Verarbeitung fehlgeschlagen: ',
    noIdp: 'Kein IdP (IDPSSODescriptor) gefunden. Stelle sicher, dass dies die Metadata eines Identitätsanbieters ist.',
    certErr: 'Zertifikatverarbeitung fehlgeschlagen: ',
    niEmail: 'emailAddress',
    niUnspec: 'unspecified',
    niPersistent: 'persistent',
    niTransient: 'transient',
  },
}
const t = useT(messages)

const mode = ref('parse')
const copied = ref('')
let copyTimer = null
function copy(text, key) {
  navigator.clipboard?.writeText(text).then(() => {
    copied.value = key
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = '' }, 1500)
  })
}

// ---------- helpers ----------
function attr(el, name) { return el.getAttribute(name) || '' }
function tag(el, local) { return Array.from(el.getElementsByTagNameNS('*', local)) }
function shortBinding(b) { return b.replace('urn:oasis:names:tc:SAML:2.0:bindings:', '') }
function shortNameId(n) { return n.replace(/urn:oasis:names:tc:SAML:[\d.]+:nameid-format:/, '') }
function stripCert(s) { return s.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '') }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

// ---------- 模式 A:解析 ----------
const idpXml = ref('')
const parseErr = ref('')
const parsed = ref(null)

async function parseIdp() {
  parseErr.value = ''
  parsed.value = null
  if (!idpXml.value.trim()) return
  let doc
  try {
    doc = new DOMParser().parseFromString(idpXml.value, 'text/xml')
    if (doc.getElementsByTagName('parsererror').length) throw new Error('')
  } catch (e) {
    parseErr.value = t('parseXmlErr') + (e.message || '')
    return
  }
  const eds = tag(doc.documentElement, 'EntityDescriptor')
  const list = eds.length ? eds : (doc.documentElement.localName === 'EntityDescriptor' ? [doc.documentElement] : [])
  let idp = null, entityId = ''
  for (const ed of list) {
    const role = tag(ed, 'IDPSSODescriptor')[0]
    if (role) { idp = role; entityId = attr(ed, 'entityID'); break }
  }
  if (!idp) { parseErr.value = t('noIdp'); return }

  // SSO 端点:优先 HTTP-Redirect
  const ssos = tag(idp, 'SingleSignOnService').map((e) => ({ b: attr(e, 'Binding'), loc: attr(e, 'Location') }))
  const sso = ssos.find((e) => /HTTP-Redirect/.test(e.b)) || ssos[0]
  const slos = tag(idp, 'SingleLogoutService').map((e) => ({ b: attr(e, 'Binding'), loc: attr(e, 'Location') }))
  const slo = slos.find((e) => /HTTP-Redirect/.test(e.b)) || slos[0]
  const nameIdFormats = tag(idp, 'NameIDFormat').map((n) => shortNameId(n.textContent.trim()))

  const certs = []
  for (const kd of tag(idp, 'KeyDescriptor')) {
    const use = attr(kd, 'use')
    if (use && use !== 'signing') continue // 飞书验签只需 signing / 未标注的证书
    const x = tag(kd, 'X509Certificate')[0]
    if (!x) continue
    const b64 = stripCert(x.textContent)
    let info = null, err = ''
    try { info = await parseCertificate(b64) } catch (e) { err = t('certErr') + (e.message || '') }
    certs.push({ use, b64, info, err })
  }

  parsed.value = {
    entityId,
    ssoUrl: sso ? sso.loc : '',
    ssoBinding: sso ? shortBinding(sso.b) : '',
    sloUrl: slo ? slo.loc : '',
    sloBinding: slo ? shortBinding(slo.b) : '',
    nameIdFormats,
    certs,
  }
}

// ---------- 模式 B:生成 ----------
// 飞书 / Lark 各区域的固定 SP 参数(源自官方 SAML 配置文档)
const PRESETS = {
  feishu: { entityId: 'https://www.feishu.cn', acs: 'https://www.feishu.cn/suite/passport/authentication/idp/saml/call_back' },
  lark: { entityId: 'https://www.larksuite.com', acs: 'https://www.larksuite.com/suite/passport/authentication/idp/saml/call_back' },
  larksg: { entityId: 'https://www.sg.larksuite.com', acs: 'https://www.sg.larksuite.com/suite/passport/authentication/idp/saml/call_back' },
  larkjp: { entityId: 'https://www-jp.larksuite.com', acs: 'https://www-jp.larksuite.com/suite/passport/authentication/idp/saml/call_back' },
}
const region = ref('feishu')
const regionOptions = computed(() => [
  { key: 'feishu', label: t('regionFeishu') },
  { key: 'lark', label: t('regionLark') },
  { key: 'larksg', label: t('regionSg') },
  { key: 'larkjp', label: t('regionJp') },
  { key: 'custom', label: t('regionCustom') },
])
const spEntityId = ref(PRESETS.feishu.entityId)
const acsUrl = ref(PRESETS.feishu.acs)
function applyRegion() {
  const p = PRESETS[region.value]
  if (p) { spEntityId.value = p.entityId; acsUrl.value = p.acs }
}
const sloUrl = ref('')
const wantAssertionsSigned = ref(true)
const authnRequestsSigned = ref(false)
const requestEmail = ref(true)
const spCertPem = ref('')
const nameIdOptions = computed(() => [
  { urn: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress', label: t('niEmail') },
  { urn: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified', label: t('niUnspec') },
  { urn: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent', label: t('niPersistent') },
  { urn: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient', label: t('niTransient') },
])
const nameIdFormat = ref('urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress')

const genError = ref('')
const genXml = computed(() => {
  genError.value = ''
  if (!acsUrl.value && !spEntityId.value && !spCertPem.value) return ''
  if (!acsUrl.value) { genError.value = t('needAcs'); return '' }
  const certB64 = spCertPem.value.trim() ? stripCert(spCertPem.value) : ''
  const keyDesc = certB64
    ? ['signing', 'encryption'].map((u) =>
`    <md:KeyDescriptor use="${u}">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${certB64}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>`).join('\n') + '\n'
    : ''
  const sloLine = sloUrl.value
    ? `    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${esc(sloUrl.value)}"/>\n`
    : ''
  const attrSvc = requestEmail.value
    ? `\n    <md:AttributeConsumingService index="0" isDefault="true">
      <md:ServiceName xml:lang="en">Feishu</md:ServiceName>
      <md:RequestedAttribute FriendlyName="email" Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic" isRequired="true"/>
    </md:AttributeConsumingService>`
    : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${esc(spEntityId.value)}">
  <md:SPSSODescriptor AuthnRequestsSigned="${authnRequestsSigned.value}" WantAssertionsSigned="${wantAssertionsSigned.value}" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
${keyDesc}${sloLine}    <md:NameIDFormat>${nameIdFormat.value}</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${esc(acsUrl.value)}" index="0" isDefault="true"/>${attrSvc}
  </md:SPSSODescriptor>
</md:EntityDescriptor>`
})

function download() {
  const blob = new Blob([genXml.value], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'feishu-sp-metadata.xml'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.fs-card { border: 1px solid var(--vp-c-border, #dcdfe6); border-radius: 8px; padding: 0.8rem 1rem; margin-top: 1rem; }
.fs-fill td { padding: 0.35rem 0.5rem; vertical-align: top; }
.fs-k { font-weight: 600; white-space: nowrap; }
.fs-v { word-break: break-all; width: 100%; }
.fs-c { white-space: nowrap; }
.fs-copy { margin: 0; padding: 0.2rem 0.7rem; font-size: 0.8rem; }
.fs-certlabel { margin-top: 1rem; }
.fs-certinfo { margin-top: 0.5rem; }
.fs-certinfo td { padding: 0.2rem 0.5rem; word-break: break-all; }
.fs-warn { margin-top: 0.8rem; }
.fs-check { display: inline-flex; align-items: center; gap: 0.4rem; margin-right: 1.5rem; font-size: 0.9rem; }
.fs-outlabel { margin-top: 1rem; }
</style>
<style scoped src="./tool-style.css"></style>
