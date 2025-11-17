// hooks/useLanguage.ts
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { changeLanguage, supportedLanguages } from '../localization/i18n'

export const useLanguage = () => {
  const { i18n, t } = useTranslation()
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language)

  const changeAppLanguage = async (languageCode: string) => {
    try {
      await changeLanguage(languageCode)
      setCurrentLanguage(languageCode)
    } catch (error) {
      console.error('Error changing language:', error)
    }
  }

  const getCurrentLanguageName = () => {
    const lang = supportedLanguages.find(l => l.code === currentLanguage)
    return lang?.name || 'English'
  }

  return {
    currentLanguage,
    changeLanguage: changeAppLanguage,
    supportedLanguages,
    t,
    getCurrentLanguageName
  }
}