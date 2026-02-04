import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, TranslationKeys } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'layerforge-language';

function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  
  const browserLang = navigator.language || (navigator as any).userLanguage || '';
  return browserLang.toLowerCase().startsWith('es') ? 'es' : 'en';
}

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  
  // Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'es') {
    return stored;
  }
  
  // Fall back to browser detection
  return detectBrowserLanguage();
}

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize language on client side
  useEffect(() => {
    setLanguageState(getInitialLanguage());
    setIsInitialized(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  const t = translations[language];

  // Prevent hydration mismatch by using default language until initialized
  if (!isInitialized) {
    return (
      <LanguageContext.Provider value={{ language: 'en', setLanguage, t: translations['en'] }}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useTranslation() {
  const { t } = useLanguage();
  return t;
}
