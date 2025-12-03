import { useContext } from "react"
import { LangContext } from "../lib/lang"

export default function LanguageToggle() {
  const { lang, setLang } = useContext(LangContext)
  return (
    <div className="flex items-center gap-2">
      <button onClick={()=>setLang('en')} className={`px-2 py-1 rounded ${lang==='en'?'bg-gray-800 text-white':''}`}>EN</button>
      <button onClick={()=>setLang('hi')} className={`px-2 py-1 rounded ${lang==='hi'?'bg-gray-800 text-white':''}`}>हिंदी</button>
    </div>
  )
}
