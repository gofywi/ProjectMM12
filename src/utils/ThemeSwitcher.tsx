/**
 * ThemeSwitcher.tsx
 * Global theme context – default light, toggleable to dark.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

// ─── Theme Type ───────────────────────────────────────────────────────────────

export interface Theme {
  background: string;
  background2: string;
  surface: string;
  surface2: string;
  surface3: string;

  primary: string;
  primaryBlue: string;
  primaryCyan: string;
  primaryLight: string;

  text: string;
  textSecondary: string;
  textTertiary: string;

  border: string;
  borderGlow: string;
  icon: string;

  error: string;
  success: string;
  shadow: string;
  inputPlaceholder: string;

  // Message bubbles
  messageUser: string;
  messageBorderUser: string;
  messageUserText: string;
  messageAI: string;
  messageBorderAI: string;
  messageAIText: string;

  // Settings cards
  settingsCardBackground: string;
  settingsCardBorder: string;
  settingsLabelColor: string;
  settingsSubLabelColor: string;
}

// ─── Dark Theme ───────────────────────────────────────────────────────────────

export const DarkTheme: Theme = {
  background: '#050816',
  background2: '#080B1F',
  surface: 'rgba(15, 23, 42, 0.92)',
  surface2: 'rgba(30, 41, 59, 0.95)',
  surface3: 'rgba(99, 102, 241, 0.10)',

  primary: '#7C3AED',
  primaryBlue: '#2563EB',
  primaryCyan: '#06B6D4',
  primaryLight: '#A78BFA',

  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',

  border: 'rgba(148, 163, 184, 0.18)',
  borderGlow: 'rgba(124, 58, 237, 0.38)',
  icon: '#CBD5E1',

  error: '#FB7185',
  success: '#4ADE80',
  shadow: '#000000',
  inputPlaceholder: '#64748B',

  messageUser: '#4F46E5',
  messageBorderUser: 'rgba(167, 139, 250, 0.32)',
  messageUserText: '#FFFFFF',

  messageAI: 'rgba(15, 23, 42, 0.92)',
  messageBorderAI: 'rgba(96, 165, 250, 0.24)',
  messageAIText: '#E5E7EB',

  settingsCardBackground: 'rgba(15, 23, 42, 0.92)',
  settingsCardBorder: 'rgba(148, 163, 184, 0.18)',
  settingsLabelColor: '#F8FAFC',
  settingsSubLabelColor: '#94A3B8',
};

// ─── Light Theme ──────────────────────────────────────────────────────────────

export const LightTheme: Theme = {
  background: '#FFFFFF',
  background2: '#F9FAFB',

  surface: '#FFFFFF',
  surface2: '#F3F4F6',
  surface3: 'rgba(99, 102, 241, 0.06)',

  primary: '#6366F1',
  primaryBlue: '#667EEA',
  primaryCyan: '#4ECDC4',
  primaryLight: '#8B5CF6',

  text: '#111827',
  textSecondary: '#4B5563',
  textTertiary: '#9CA3AF',

  border: 'rgba(0,0,0,0.08)',
  borderGlow: 'rgba(99, 102, 241, 0.18)',

  icon: '#6B7280',

  error: '#E5736A',
  success: '#10B981',
  shadow: '#000000',

  inputPlaceholder: '#9CA3AF',

  // Message bubbles
  messageUser: '#6366F1',
  messageBorderUser: '#7C8AFF',
  messageUserText: '#FFFFFF',

  messageAI: '#F9FAFB',
  messageBorderAI: 'rgba(0,0,0,0.05)',
  messageAIText: '#1F2937',

  // Settings
  settingsCardBackground: '#FFFFFF',
  settingsCardBorder: 'rgba(0,0,0,0.06)',
  settingsLabelColor: '#111827',
  settingsSubLabelColor: '#6B7280',
};

// ─── Context ──────────────────────────────────────────────────────────────────

export interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: LightTheme,
  isDark: false,
  toggleTheme: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(false); // default: light

  const toggleTheme = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme: isDark ? DarkTheme : LightTheme, isDark, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useTheme = (): ThemeContextValue => {
  return useContext(ThemeContext);
};