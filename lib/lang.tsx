import { createContext } from "react"

export const LangContext = createContext<any>({ lang: 'en', setLang: (_:any)=>{} })

export const LanguageProvider = LangContext.Provider
