import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved === 'dark';
    });

    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('color-theme') || 'orange';
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    useEffect(() => {
        // Remove all color theme classes first
        const themeClasses = ['theme-blue', 'theme-purple', 'theme-rose', 'theme-emerald'];
        document.documentElement.classList.remove(...themeClasses);
        
        // Add current theme class if not default (orange)
        if (theme !== 'orange') {
            document.documentElement.classList.add(`theme-${theme}`);
        }
        localStorage.setItem('color-theme', theme);
    }, [theme]);

    const toggleTheme = () => setIsDark(prev => !prev);

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};
