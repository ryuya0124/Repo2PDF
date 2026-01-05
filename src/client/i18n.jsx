// i18n.js - 軽量な国際化システム
import React, { createContext, useContext, useState } from 'react';
import { translations } from './translations';

// 言語コンテキストの作成
const I18nContext = createContext();

// ブラウザの言語を検出
const detectBrowserLanguage = () => {
  const browserLang = navigator.language || navigator.userLanguage;
  return browserLang.startsWith('ja') ? 'ja' : 'en';
};

// I18nプロバイダーコンポーネント
export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // localStorageから言語設定を読み込む、なければブラウザ言語を使用
    const savedLang = localStorage.getItem('language');
    return savedLang || detectBrowserLanguage();
  });

  // 言語を切り替える関数
  const toggleLanguage = () => {
    setLanguage(prev => {
      const newLang = prev === 'ja' ? 'en' : 'ja';
      localStorage.setItem('language', newLang);
      return newLang;
    });
  };

  // 翻訳関数
  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    return value;
  };

  return (
    <I18nContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// カスタムフック
export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}
