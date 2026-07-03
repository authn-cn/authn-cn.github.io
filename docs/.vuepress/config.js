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
        ],
      },
      {
        text: '在线工具',
        children: [
          { text: '工具总览', link: '/tools/' },
          { text: 'JWT 解析器', link: '/tools/jwt.html' },
          { text: 'SAML 编解码', link: '/tools/saml.html' },
        ],
      },
      { text: 'Mock 服务器', link: '/mock/' },
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
      '/tools/': [
        {
          text: '在线工具',
          children: [
            '/tools/README.md',
            '/tools/jwt.md',
            '/tools/saml.md',
          ],
        },
      ],
      '/mock/': [
        {
          text: 'Mock 服务器',
          children: ['/mock/README.md'],
        },
      ],
    },
  }),
})
