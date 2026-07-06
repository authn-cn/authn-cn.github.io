import { viteBundler } from '@vuepress/bundler-vite'
import { defaultTheme } from '@vuepress/theme-default'
import { defineUserConfig } from 'vuepress'
import { getDirname, path } from 'vuepress/utils'

const __dirname = getDirname(import.meta.url)

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

  lang: 'zh-CN',
  title: 'Authn.tech',
  description: '关注身份认证与授权技术的中文站点',

  theme: defaultTheme({
    repo: 'authn-cn/authn-cn.github.io',
    docsDir: 'docs',
    editLink: false,
    lastUpdatedText: '最近更新',
    contributorsText: '贡献者',

    navbar: [
      { text: '首页', link: '/' },
      {
        text: '协议文档',
        children: [
          { text: 'SAML 2.0', link: '/saml/' },
          { text: 'OAuth 2.0', link: '/oauth2/' },
          { text: 'OIDC', link: '/oidc/' },
          { text: 'WebAuthn / Passkey', link: '/webauthn/' },
          { text: 'MFA / TOTP', link: '/mfa/' },
        ],
      },
      {
        text: '在线工具',
        children: [
          { text: '工具总览', link: '/tools/' },
          { text: 'JWT 解析与验签', link: '/tools/jwt.html' },
          { text: 'JWT 签名生成', link: '/tools/jwt-sign.html' },
          { text: 'JWK / 密钥生成', link: '/tools/jwk.html' },
          { text: 'JWK / JWKS → PEM', link: '/tools/jwk-convert.html' },
          { text: 'PEM → JWK', link: '/tools/pem-to-jwk.html' },
          { text: 'PKCE 生成器', link: '/tools/pkce.html' },
          { text: 'OIDC Discovery', link: '/tools/discovery.html' },
          { text: 'TOTP 工具', link: '/tools/totp.html' },
          { text: 'WebAuthn 演示', link: '/tools/webauthn.html' },
          { text: 'SAML 编解码', link: '/tools/saml.html' },
          { text: 'SAML Metadata 解析', link: '/tools/saml-metadata.html' },
          { text: 'SAML Response 解析', link: '/tools/saml-parse.html' },
          { text: 'X.509 证书解析', link: '/tools/cert.html' },
          { text: 'PEM 解析器', link: '/tools/pem-parse.html' },
          { text: 'Base64URL', link: '/tools/base64url.html' },
        ],
      },
      {
        text: 'Mock 服务器',
        children: [
          { text: '概览 / 角色术语', link: '/mock/' },
          { text: 'OIDC Mock', link: '/mock/oidc.html' },
          { text: 'SAML Mock', link: '/mock/saml.html' },
          { text: 'OIDC 登录演示', link: '/mock/demo.html' },
          { text: 'SAML 登录演示', link: '/mock/saml-demo.html' },
        ],
      },
    ],

    sidebar: {
      '/saml/': [
        {
          text: 'SAML 2.0',
          children: [
            '/saml/README.md',
            '/saml/concepts.md',
            '/saml/flows.md',
            '/saml/reference.md',
          ],
        },
      ],
      '/oauth2/': [
        {
          text: 'OAuth 2.0',
          children: [
            '/oauth2/README.md',
            '/oauth2/concepts.md',
            '/oauth2/flows.md',
            '/oauth2/reference.md',
          ],
        },
      ],
      '/oidc/': [
        {
          text: 'OpenID Connect',
          children: [
            '/oidc/README.md',
            '/oidc/concepts.md',
            '/oidc/flows.md',
            '/oidc/reference.md',
          ],
        },
      ],
      '/webauthn/': [
        {
          text: 'WebAuthn / Passkey',
          children: [
            '/webauthn/README.md',
            '/webauthn/concepts.md',
            '/webauthn/flows.md',
            '/webauthn/reference.md',
          ],
        },
      ],
      '/mfa/': [
        {
          text: 'MFA / 一次性密码',
          children: [
            '/mfa/README.md',
            '/mfa/totp.md',
            '/mfa/reference.md',
          ],
        },
      ],
      '/tools/': [
        {
          text: '在线工具',
          children: [
            { text: '工具总览', link: '/tools/' },
            {
              text: 'JWT / JWK',
              children: [
                { text: 'JWT 解析', link: '/tools/jwt.html' },
                { text: 'JWT 签名', link: '/tools/jwt-sign.html' },
                { text: 'JWK 生成', link: '/tools/jwk.html' },
                { text: 'JWK → PEM', link: '/tools/jwk-convert.html' },
                { text: 'PEM → JWK', link: '/tools/pem-to-jwk.html' },
              ],
            },
            {
              text: 'OAuth2 / OIDC',
              children: [
                { text: 'PKCE 生成', link: '/tools/pkce.html' },
                { text: 'Discovery', link: '/tools/discovery.html' },
              ],
            },
            {
              text: 'MFA / Passkey',
              children: [
                { text: 'TOTP', link: '/tools/totp.html' },
                { text: 'WebAuthn', link: '/tools/webauthn.html' },
              ],
            },
            {
              text: 'SAML',
              children: [
                { text: '编解码', link: '/tools/saml.html' },
                { text: 'Metadata 解析', link: '/tools/saml-metadata.html' },
                { text: 'Response 解析', link: '/tools/saml-parse.html' },
              ],
            },
            {
              text: '证书 / 编码',
              children: [
                { text: 'X.509 证书', link: '/tools/cert.html' },
                { text: 'PEM 解析', link: '/tools/pem-parse.html' },
                { text: 'Base64URL', link: '/tools/base64url.html' },
              ],
            },
          ],
        },
      ],
      '/mock/': [
        {
          text: 'Mock 服务器',
          children: [
            { text: '概览 / 角色术语', link: '/mock/' },
            { text: 'OIDC Mock', link: '/mock/oidc.html' },
            { text: 'SAML Mock', link: '/mock/saml.html' },
            { text: 'OIDC 登录演示', link: '/mock/demo.html' },
            { text: 'SAML 登录演示', link: '/mock/saml-demo.html' },
          ],
        },
      ],
    },
  }),
})
