import { viteBundler } from '@vuepress/bundler-vite'
import { defaultTheme } from '@vuepress/theme-default'
import { defineUserConfig } from 'vuepress'
import { getDirname, path } from 'vuepress/utils'

const __dirname = getDirname(import.meta.url)

// 各语言的可翻译标签(专有名词类保持一致的放在 genNavbar/genSidebar 里直接写)
const T = {
  zh: {
    home: '首页', protocols: '协议文档', tools: '在线工具', mock: 'Mock 服务器',
    mfaH: 'MFA / 一次性密码', toolsH: '在线工具', mockH: 'Mock 服务器',
    allTools: '工具总览', certGroup: '证书 / 编码',
    overview: '概览 / 角色术语', mail: '邮件服务器', ldapDir: 'LDAP 目录', oidcDemo: 'OIDC 登录演示', samlDemo: 'SAML 登录演示',
    jwt: 'JWT 解析', jwtSign: 'JWT 签名', jwk: 'JWK 生成', pkce: 'PKCE 生成', saml: 'SAML 编解码',
    cert: 'X.509 证书', pemParse: 'PEM 解析', ldapFilter: 'LDAP 过滤器',
  },
  en: {
    home: 'Home', protocols: 'Protocols', tools: 'Tools', mock: 'Mock Servers',
    mfaH: 'MFA / OTP', toolsH: 'Online Tools', mockH: 'Mock Servers',
    allTools: 'All Tools', certGroup: 'Certs / Encoding',
    overview: 'Overview & Roles', mail: 'Mail Server', ldapDir: 'LDAP Directory', oidcDemo: 'OIDC Login Demo', samlDemo: 'SAML Login Demo',
    jwt: 'JWT Decode', jwtSign: 'JWT Sign', jwk: 'JWK Gen', pkce: 'PKCE Gen', saml: 'SAML Codec',
    cert: 'X.509 Cert', pemParse: 'PEM Inspect', ldapFilter: 'LDAP Filter',
  },
  de: {
    home: 'Startseite', protocols: 'Protokolle', tools: 'Tools', mock: 'Mock-Server',
    mfaH: 'MFA / OTP', toolsH: 'Online-Tools', mockH: 'Mock-Server',
    allTools: 'Alle Tools', certGroup: 'Zertifikate / Kodierung',
    overview: 'Übersicht & Rollen', mail: 'Mail-Server', ldapDir: 'LDAP-Verzeichnis', oidcDemo: 'OIDC-Login-Demo', samlDemo: 'SAML-Login-Demo',
    jwt: 'JWT dekodieren', jwtSign: 'JWT signieren', jwk: 'JWK erzeugen', pkce: 'PKCE erzeugen', saml: 'SAML-Codec',
    cert: 'X.509-Zertifikat', pemParse: 'PEM prüfen', ldapFilter: 'LDAP-Filter',
  },
}

// prefix: '' | '/en' | '/de'
function genNavbar(prefix, t) {
  const p = (s) => prefix + s
  return [
    { text: t.home, link: p('/') },
    {
      text: t.protocols,
      children: [
        { text: 'SAML 2.0', link: p('/saml/') },
        { text: 'OAuth 2.0', link: p('/oauth2/') },
        { text: 'OIDC', link: p('/oidc/') },
        { text: 'WebAuthn / Passkey', link: p('/webauthn/') },
        { text: 'MFA / TOTP', link: p('/mfa/') },
        { text: 'LDAP', link: p('/ldap/') },
      ],
    },
    {
      text: t.tools,
      children: [
        { text: t.allTools, link: p('/tools/') },
        { text: t.jwt, link: p('/tools/jwt.html') },
        { text: t.jwtSign, link: p('/tools/jwt-sign.html') },
        { text: t.jwk, link: p('/tools/jwk.html') },
        { text: 'JWK → PEM', link: p('/tools/jwk-convert.html') },
        { text: 'PEM → JWK', link: p('/tools/pem-to-jwk.html') },
        { text: t.pkce, link: p('/tools/pkce.html') },
        { text: 'OIDC Discovery', link: p('/tools/discovery.html') },
        { text: 'TOTP', link: p('/tools/totp.html') },
        { text: 'WebAuthn', link: p('/tools/webauthn.html') },
        { text: t.saml, link: p('/tools/saml.html') },
        { text: 'SAML Metadata', link: p('/tools/saml-metadata.html') },
        { text: 'SAML Response', link: p('/tools/saml-parse.html') },
        { text: t.cert, link: p('/tools/cert.html') },
        { text: t.pemParse, link: p('/tools/pem-parse.html') },
        { text: 'Base64URL', link: p('/tools/base64url.html') },
        { text: t.ldapFilter, link: p('/tools/ldap-filter.html') },
      ],
    },
    {
      text: t.mock,
      children: [
        { text: t.overview, link: p('/mock/') },
        { text: 'OIDC Mock', link: p('/mock/oidc.html') },
        { text: 'SAML Mock', link: p('/mock/saml.html') },
        { text: t.mail, link: p('/mock/mail.html') },
        { text: t.ldapDir, link: p('/mock/ldap.html') },
        { text: t.oidcDemo, link: p('/mock/demo.html') },
        { text: t.samlDemo, link: p('/mock/saml-demo.html') },
      ],
    },
  ]
}

function genSidebar(prefix, t) {
  const p = (s) => prefix + s
  return {
    [p('/saml/')]: [{ text: 'SAML 2.0', children: [p('/saml/README.md'), p('/saml/concepts.md'), p('/saml/flows.md'), p('/saml/reference.md')] }],
    [p('/oauth2/')]: [{ text: 'OAuth 2.0', children: [p('/oauth2/README.md'), p('/oauth2/concepts.md'), p('/oauth2/flows.md'), p('/oauth2/reference.md')] }],
    [p('/oidc/')]: [{ text: 'OpenID Connect', children: [p('/oidc/README.md'), p('/oidc/concepts.md'), p('/oidc/flows.md'), p('/oidc/reference.md')] }],
    [p('/webauthn/')]: [{ text: 'WebAuthn / Passkey', children: [p('/webauthn/README.md'), p('/webauthn/concepts.md'), p('/webauthn/flows.md'), p('/webauthn/reference.md')] }],
    [p('/mfa/')]: [{ text: t.mfaH, children: [p('/mfa/README.md'), p('/mfa/totp.md'), p('/mfa/reference.md')] }],
    [p('/ldap/')]: [{ text: 'LDAP', children: [p('/ldap/README.md'), p('/ldap/concepts.md'), p('/ldap/flows.md'), p('/ldap/reference.md')] }],
    [p('/tools/')]: [
      {
        text: t.toolsH,
        children: [
          { text: t.allTools, link: p('/tools/') },
          { text: 'JWT / JWK', children: [
            { text: t.jwt, link: p('/tools/jwt.html') },
            { text: t.jwtSign, link: p('/tools/jwt-sign.html') },
            { text: t.jwk, link: p('/tools/jwk.html') },
            { text: 'JWK → PEM', link: p('/tools/jwk-convert.html') },
            { text: 'PEM → JWK', link: p('/tools/pem-to-jwk.html') },
          ] },
          { text: 'OAuth2 / OIDC', children: [
            { text: t.pkce, link: p('/tools/pkce.html') },
            { text: 'Discovery', link: p('/tools/discovery.html') },
          ] },
          { text: 'MFA / Passkey', children: [
            { text: 'TOTP', link: p('/tools/totp.html') },
            { text: 'WebAuthn', link: p('/tools/webauthn.html') },
          ] },
          { text: 'SAML', children: [
            { text: t.saml, link: p('/tools/saml.html') },
            { text: 'SAML Metadata', link: p('/tools/saml-metadata.html') },
            { text: 'SAML Response', link: p('/tools/saml-parse.html') },
          ] },
          { text: t.certGroup, children: [
            { text: t.cert, link: p('/tools/cert.html') },
            { text: t.pemParse, link: p('/tools/pem-parse.html') },
            { text: 'Base64URL', link: p('/tools/base64url.html') },
          ] },
          { text: 'LDAP', children: [
            { text: t.ldapFilter, link: p('/tools/ldap-filter.html') },
          ] },
        ],
      },
    ],
    [p('/mock/')]: [
      {
        text: t.mockH,
        children: [
          { text: t.overview, link: p('/mock/') },
          { text: 'OIDC Mock', link: p('/mock/oidc.html') },
          { text: 'SAML Mock', link: p('/mock/saml.html') },
          { text: t.mail, link: p('/mock/mail.html') },
          { text: t.ldapDir, link: p('/mock/ldap.html') },
          { text: t.oidcDemo, link: p('/mock/demo.html') },
          { text: t.samlDemo, link: p('/mock/saml-demo.html') },
        ],
      },
    ],
  }
}

export default defineUserConfig({
  bundler: viteBundler({
    viteOptions: {
      resolve: {
        alias: {
          '@components': path.resolve(__dirname, 'components'),
        },
      },
    },
  }),

  locales: {
    '/': { lang: 'zh-CN', title: 'Authn.tech', description: '身份认证与授权的中文工具站' },
    '/en/': { lang: 'en-US', title: 'Authn.tech', description: 'Hands-on tools & docs for authentication and authorization' },
    '/de/': { lang: 'de-DE', title: 'Authn.tech', description: 'Praktische Tools und Doku zu Authentifizierung und Autorisierung' },
  },

  theme: defaultTheme({
    repo: 'authn-cn/authn-cn.github.io',
    docsDir: 'docs',
    editLink: false,

    locales: {
      '/': {
        selectLanguageName: '简体中文',
        selectLanguageText: '语言',
        lastUpdatedText: '最近更新',
        contributorsText: '贡献者',
        navbar: genNavbar('', T.zh),
        sidebar: genSidebar('', T.zh),
      },
      '/en/': {
        selectLanguageName: 'English',
        selectLanguageText: 'Language',
        lastUpdatedText: 'Last updated',
        contributorsText: 'Contributors',
        navbar: genNavbar('/en', T.en),
        sidebar: genSidebar('/en', T.en),
      },
      '/de/': {
        selectLanguageName: 'Deutsch',
        selectLanguageText: 'Sprache',
        lastUpdatedText: 'Zuletzt aktualisiert',
        contributorsText: 'Mitwirkende',
        navbar: genNavbar('/de', T.de),
        sidebar: genSidebar('/de', T.de),
      },
    },
  }),
})
