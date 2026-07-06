<template>
  <div class="authn-tool">
    <div class="authn-tabs">
      <button
        class="authn-tab"
        :class="{ active: tab === 'decode' }"
        @click="tab = 'decode'"
      >{{ t('decodeTab') }}</button>
      <button
        class="authn-tab"
        :class="{ active: tab === 'encode' }"
        @click="tab = 'encode'"
      >{{ t('encodeTab') }}</button>
    </div>

    <!-- ==================== 解码 ==================== -->
    <div v-show="tab === 'decode'">
      <label class="authn-label" for="saml-input">
        {{ t('decodeInputLabel') }}
      </label>
      <textarea
        id="saml-input"
        v-model="encoded"
        class="authn-textarea"
        rows="6"
        spellcheck="false"
        :placeholder="t('decodeInputPlaceholder')"
      ></textarea>
      <button class="authn-btn" @click="doDecode">{{ t('decodeBtn') }}</button>
      <p v-if="decodeError" class="authn-error">{{ decodeError }}</p>
      <template v-if="decodedXml">
        <p class="authn-note">{{ t('detectedPrefix') }}{{ detected }}</p>
        <h4>{{ t('decodeResultHeading') }}</h4>
        <pre class="authn-pre">{{ decodedXml }}</pre>
      </template>
    </div>

    <!-- ==================== 生成 ==================== -->
    <div v-show="tab === 'encode'">
      <div class="authn-row">
        <div class="authn-field">
          <label class="authn-label">{{ t('issuerLabel') }}</label>
          <input v-model="form.issuer" class="authn-input" placeholder="https://sp.example.com/metadata" />
        </div>
        <div class="authn-field">
          <label class="authn-label">{{ t('destinationLabel') }}</label>
          <input v-model="form.destination" class="authn-input" placeholder="https://idp.example.com/sso" />
        </div>
      </div>
      <div class="authn-row">
        <div class="authn-field">
          <label class="authn-label">{{ t('acsLabel') }}</label>
          <input v-model="form.acs" class="authn-input" placeholder="https://sp.example.com/acs" />
        </div>
        <div class="authn-field">
          <label class="authn-label">NameID Format</label>
          <select v-model="form.nameIdFormat" class="authn-select">
            <option value="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">emailAddress</option>
            <option value="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">persistent</option>
            <option value="urn:oasis:names:tc:SAML:2.0:nameid-format:transient">transient</option>
            <option value="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">unspecified</option>
          </select>
        </div>
      </div>
      <div class="authn-row">
        <div class="authn-field">
          <label class="authn-label">{{ t('relayStateLabel') }}</label>
          <input v-model="form.relayState" class="authn-input" placeholder="/dashboard" />
        </div>
        <div class="authn-field">
          <label class="authn-label">{{ t('protocolBindingLabel') }}</label>
          <select v-model="form.protocolBinding" class="authn-select">
            <option value="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">HTTP-POST</option>
            <option value="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Artifact">HTTP-Artifact</option>
          </select>
        </div>
      </div>
      <button class="authn-btn" @click="doEncode">{{ t('encodeBtn') }}</button>
      <p v-if="encodeError" class="authn-error">{{ encodeError }}</p>
      <template v-if="genXml">
        <h4>{{ t('genXmlHeading') }}</h4>
        <pre class="authn-pre">{{ genXml }}</pre>
        <h4>{{ t('genEncodedHeading') }}</h4>
        <pre class="authn-pre">{{ genEncoded }}</pre>
        <h4>{{ t('genUrlHeading') }}</h4>
        <pre class="authn-pre">{{ genUrl }}</pre>
        <p class="authn-note" v-html="t('unsignedNote')"></p>
      </template>
    </div>

    <p class="authn-note">{{ t('localOnlyNote') }}</p>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useT } from './i18n.js'

const messages = {
  zh: {
    decodeTab: '解码 SAML 报文',
    encodeTab: '生成 AuthnRequest',
    decodeInputLabel: 'SAMLRequest / SAMLResponse 参数值、完整 Redirect URL,或原始 XML',
    decodeInputPlaceholder: '支持三种输入：Redirect Binding 的 URL（自动提取参数）、Base64(+deflate) 编码串、或直接粘贴 XML',
    decodeBtn: '解码',
    detectedPrefix: '检测到编码方式：',
    decodeResultHeading: '解码结果',
    issuerLabel: 'Issuer（SP EntityID）',
    destinationLabel: 'Destination（IdP SSO URL）',
    acsLabel: 'AssertionConsumerServiceURL（SP ACS）',
    relayStateLabel: 'RelayState（可选）',
    protocolBindingLabel: 'ProtocolBinding（Response 回传方式）',
    encodeBtn: '生成',
    genXmlHeading: 'AuthnRequest XML',
    genEncodedHeading: 'Redirect Binding 编码值（deflate → base64 → urlencode）',
    genUrlHeading: '完整 Redirect URL',
    unsignedNote: '⚠️ 生成的请求<strong>未签名</strong>。若 IdP 要求 <code>WantAuthnRequestsSigned</code>,还需追加 SigAlg 与 Signature 参数。',
    localOnlyNote: '所有编解码均在浏览器本地完成,报文不会被上传到任何服务器。',
    urlParamNotFound: 'URL 中未找到 SAMLRequest 或 SAMLResponse 参数。',
    fullUrlPrefix: '完整 URL → ',
    rawXmlDetected: '原始 XML（未编码）',
    base64PostBinding: 'Base64（POST Binding）',
    noDecompressionStream: '当前浏览器不支持 DecompressionStream,无法解压 deflate 数据。请使用较新版本的 Chrome / Edge / Firefox / Safari。',
    inflateNotXml: '解压结果不是 XML。',
    base64DeflateRedirect: 'Base64 + Deflate（Redirect Binding）',
    decodeFailPrefix: '解码失败：',
    decodeFailDefault: '输入不是合法的 SAML 编码数据。',
    requiredFieldsError: 'Issuer、Destination、ACS URL 均为必填。',
    noCompressionStream: '当前浏览器不支持 CompressionStream,无法生成 deflate 编码。请使用较新版本的 Chrome / Edge / Firefox / Safari。',
    encodeFailPrefix: '生成失败：',
  },
  en: {
    decodeTab: 'Decode SAML message',
    encodeTab: 'Generate AuthnRequest',
    decodeInputLabel: 'SAMLRequest / SAMLResponse parameter value, full Redirect URL, or raw XML',
    decodeInputPlaceholder: 'Three input types supported: a Redirect Binding URL (parameter auto-extracted), a Base64(+deflate) encoded string, or raw pasted XML',
    decodeBtn: 'Decode',
    detectedPrefix: 'Detected encoding: ',
    decodeResultHeading: 'Decoded result',
    issuerLabel: 'Issuer (SP EntityID)',
    destinationLabel: 'Destination (IdP SSO URL)',
    acsLabel: 'AssertionConsumerServiceURL (SP ACS)',
    relayStateLabel: 'RelayState (optional)',
    protocolBindingLabel: 'ProtocolBinding (Response return method)',
    encodeBtn: 'Generate',
    genXmlHeading: 'AuthnRequest XML',
    genEncodedHeading: 'Redirect Binding encoded value (deflate → base64 → urlencode)',
    genUrlHeading: 'Full Redirect URL',
    unsignedNote: '⚠️ The generated request is <strong>unsigned</strong>. If the IdP requires <code>WantAuthnRequestsSigned</code>, you must also append SigAlg and Signature parameters.',
    localOnlyNote: 'All encoding/decoding happens locally in your browser; nothing is uploaded to any server.',
    urlParamNotFound: 'No SAMLRequest or SAMLResponse parameter was found in the URL.',
    fullUrlPrefix: 'Full URL → ',
    rawXmlDetected: 'Raw XML (unencoded)',
    base64PostBinding: 'Base64 (POST Binding)',
    noDecompressionStream: 'This browser does not support DecompressionStream and cannot decompress deflate data. Please use a newer version of Chrome / Edge / Firefox / Safari.',
    inflateNotXml: 'The decompressed result is not XML.',
    base64DeflateRedirect: 'Base64 + Deflate (Redirect Binding)',
    decodeFailPrefix: 'Decoding failed: ',
    decodeFailDefault: 'Input is not valid SAML encoded data.',
    requiredFieldsError: 'Issuer, Destination, and ACS URL are all required.',
    noCompressionStream: 'This browser does not support CompressionStream and cannot generate deflate encoding. Please use a newer version of Chrome / Edge / Firefox / Safari.',
    encodeFailPrefix: 'Generation failed: ',
  },
  de: {
    decodeTab: 'SAML-Nachricht dekodieren',
    encodeTab: 'AuthnRequest erzeugen',
    decodeInputLabel: 'SAMLRequest-/SAMLResponse-Parameterwert, vollständige Redirect-URL oder rohes XML',
    decodeInputPlaceholder: 'Drei Eingabearten werden unterstützt: eine Redirect-Binding-URL (Parameter wird automatisch extrahiert), eine Base64(+deflate)-kodierte Zeichenfolge oder direkt eingefügtes XML',
    decodeBtn: 'Dekodieren',
    detectedPrefix: 'Erkannte Kodierung: ',
    decodeResultHeading: 'Dekodiertes Ergebnis',
    issuerLabel: 'Issuer (SP EntityID)',
    destinationLabel: 'Destination (IdP-SSO-URL)',
    acsLabel: 'AssertionConsumerServiceURL (SP-ACS)',
    relayStateLabel: 'RelayState (optional)',
    protocolBindingLabel: 'ProtocolBinding (Rückgabemethode der Response)',
    encodeBtn: 'Erzeugen',
    genXmlHeading: 'AuthnRequest-XML',
    genEncodedHeading: 'Kodierter Wert für Redirect Binding (deflate → base64 → urlencode)',
    genUrlHeading: 'Vollständige Redirect-URL',
    unsignedNote: '⚠️ Die erzeugte Anfrage ist <strong>nicht signiert</strong>. Falls der IdP <code>WantAuthnRequestsSigned</code> verlangt, müssen zusätzlich die Parameter SigAlg und Signature angehängt werden.',
    localOnlyNote: 'Sämtliche Kodierung/Dekodierung erfolgt lokal im Browser; es werden keine Daten an einen Server übertragen.',
    urlParamNotFound: 'In der URL wurde kein Parameter SAMLRequest oder SAMLResponse gefunden.',
    fullUrlPrefix: 'Vollständige URL → ',
    rawXmlDetected: 'Rohes XML (unkodiert)',
    base64PostBinding: 'Base64 (POST Binding)',
    noDecompressionStream: 'Dieser Browser unterstützt DecompressionStream nicht und kann Deflate-Daten nicht dekomprimieren. Bitte verwenden Sie eine neuere Version von Chrome / Edge / Firefox / Safari.',
    inflateNotXml: 'Das dekomprimierte Ergebnis ist kein XML.',
    base64DeflateRedirect: 'Base64 + Deflate (Redirect Binding)',
    decodeFailPrefix: 'Dekodierung fehlgeschlagen: ',
    decodeFailDefault: 'Die Eingabe ist keine gültige SAML-kodierte Daten.',
    requiredFieldsError: 'Issuer, Destination und ACS-URL sind alle erforderlich.',
    noCompressionStream: 'Dieser Browser unterstützt CompressionStream nicht und kann keine Deflate-Kodierung erzeugen. Bitte verwenden Sie eine neuere Version von Chrome / Edge / Firefox / Safari.',
    encodeFailPrefix: 'Erzeugung fehlgeschlagen: ',
  },
}
const t = useT(messages)

const tab = ref('decode')

// ---------- 解码 ----------
const encoded = ref('')
const decodedXml = ref('')
const decodeError = ref('')
const detected = ref('')

function b64ToBytes(s) {
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function inflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([bytes]).stream().pipeThrough(ds)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function deflateRaw(bytes) {
  const cs = new CompressionStream('deflate-raw')
  const stream = new Blob([bytes]).stream().pipeThrough(cs)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function bytesToB64(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function formatXml(xml) {
  let out = ''
  let indent = 0
  const nodes = xml.replace(/>\s*</g, '><').split(/(?=<)|(?<=>)/g).filter(Boolean)
  for (const node of nodes) {
    if (/^<\/[^>]+>/.test(node)) indent = Math.max(0, indent - 1)
    out += '  '.repeat(indent) + node.trim() + '\n'
    if (/^<[^!?/][^>]*[^/]>$/.test(node.trim())) indent++
  }
  return out.trim()
}

async function doDecode() {
  decodeError.value = ''
  decodedXml.value = ''
  detected.value = ''
  let input = encoded.value.trim()
  if (!input) return

  try {
    // 完整 URL：提取 SAMLRequest / SAMLResponse 参数
    if (/^https?:\/\//i.test(input)) {
      const u = new URL(input)
      const param = u.searchParams.get('SAMLRequest') || u.searchParams.get('SAMLResponse')
      if (!param) throw new Error(t('urlParamNotFound'))
      input = param
      detected.value = t('fullUrlPrefix')
    } else if (/%[0-9a-fA-F]{2}/.test(input) && !input.startsWith('<')) {
      input = decodeURIComponent(input)
    }

    // 直接是 XML
    if (input.startsWith('<')) {
      detected.value += t('rawXmlDetected')
      decodedXml.value = formatXml(input)
      return
    }

    const bytes = b64ToBytes(input.replace(/\s/g, ''))
    const asText = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    if (asText.trimStart().startsWith('<')) {
      // POST Binding：仅 base64
      detected.value += t('base64PostBinding')
      decodedXml.value = formatXml(asText)
      return
    }

    // Redirect Binding：base64 + raw deflate
    if (typeof DecompressionStream === 'undefined') {
      throw new Error(t('noDecompressionStream'))
    }
    const inflated = await inflateRaw(bytes)
    const xml = new TextDecoder('utf-8').decode(inflated)
    if (!xml.trimStart().startsWith('<')) throw new Error(t('inflateNotXml'))
    detected.value += t('base64DeflateRedirect')
    decodedXml.value = formatXml(xml)
  } catch (e) {
    decodeError.value = t('decodeFailPrefix') + (e.message || t('decodeFailDefault'))
  }
}

// ---------- 生成 ----------
const form = reactive({
  issuer: 'https://sp.example.com/metadata',
  destination: 'https://idp.example.com/sso',
  acs: 'https://sp.example.com/acs',
  nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  relayState: '',
  protocolBinding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
})
const genXml = ref('')
const genEncoded = ref('')
const genUrl = ref('')
const encodeError = ref('')

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

async function doEncode() {
  encodeError.value = ''
  genXml.value = ''
  genEncoded.value = ''
  genUrl.value = ''

  if (!form.issuer || !form.destination || !form.acs) {
    encodeError.value = t('requiredFieldsError')
    return
  }

  const id = '_' + crypto.randomUUID()
  const issueInstant = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const xml =
    `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ` +
    `xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ` +
    `ID="${id}" Version="2.0" IssueInstant="${issueInstant}" ` +
    `Destination="${esc(form.destination)}" ` +
    `ProtocolBinding="${form.protocolBinding}" ` +
    `AssertionConsumerServiceURL="${esc(form.acs)}">` +
    `<saml:Issuer>${esc(form.issuer)}</saml:Issuer>` +
    `<samlp:NameIDPolicy Format="${form.nameIdFormat}" AllowCreate="true"/>` +
    `</samlp:AuthnRequest>`

  try {
    if (typeof CompressionStream === 'undefined') {
      throw new Error(t('noCompressionStream'))
    }
    const deflated = await deflateRaw(new TextEncoder().encode(xml))
    const b64 = bytesToB64(deflated)
    genXml.value = formatXml(xml)
    genEncoded.value = encodeURIComponent(b64)
    let url = form.destination + (form.destination.includes('?') ? '&' : '?') + 'SAMLRequest=' + encodeURIComponent(b64)
    if (form.relayState) url += '&RelayState=' + encodeURIComponent(form.relayState)
    genUrl.value = url
  } catch (e) {
    encodeError.value = t('encodeFailPrefix') + (e.message || String(e))
  }
}
</script>

<style scoped src="./tool-style.css"></style>
