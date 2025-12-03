import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { useState } from 'react'
import { LanguageProvider } from '../lib/lang'

export default function App({ Component, pageProps }: AppProps) {
  const [lang, setLang] = useState<'en'|'hi'>('en')
  return (
    <LanguageProvider value={{ lang, setLang }}>
      <Component {...pageProps} />
    </LanguageProvider>
  )
}
