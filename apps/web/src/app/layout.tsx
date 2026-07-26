import type { Metadata, Viewport } from 'next'
import { toCssText } from '@tickcap/tokens'
import './globals.css'

export const metadata: Metadata = {
  title: 'TickCap · 滴答胶囊',
  description: '把每一刻装进胶囊，把每一天串成时间轴，让 AI 帮你复盘人生。',
  applicationName: 'TickCap',
  appleWebApp: { capable: true, title: 'TickCap', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FCF2FA' },
    { media: '(prefers-color-scheme: dark)', color: '#150F20' },
  ],
}

/* 主题变量从 @tickcap/tokens 生成注入：跟随系统 + data-theme 手动覆盖 */
/* [data-theme] 同时支持根元素（全局切换）与任意容器（如封存流程强制深色场景） */
const themeCss = `
:root { ${toCssText('light')} }
@media (prefers-color-scheme: dark) { :root { ${toCssText('dark')} } }
[data-theme='light'] { ${toCssText('light')} }
[data-theme='dark'] { ${toCssText('dark')} }
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
