"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  systemTheme: Theme;
  isSystemDefault: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("color-scheme") as Theme | null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [systemTheme, setSystemTheme] = useState<Theme>(() => getSystemTheme());
  const [pinnedTheme, setPinnedTheme] = useState<Theme | null>(() => getStoredTheme());

  const theme = pinnedTheme ?? systemTheme;
  const isSystemDefault = pinnedTheme === null;

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = pinnedTheme ?? systemTheme;
    
    // Toggle the .dark class for Tailwind dark: variants
    if (currentTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (pinnedTheme) {
      root.setAttribute("data-theme", pinnedTheme);
      localStorage.setItem("color-scheme", pinnedTheme);
    } else {
      root.removeAttribute("data-theme");
      localStorage.removeItem("color-scheme");
    }
  }, [pinnedTheme, systemTheme]);

  // Two-state toggle: system ↔ opposite
  const toggleTheme = useCallback(() => {
    if (pinnedTheme === null) {
      // Currently using system default → pin to opposite
      setPinnedTheme(systemTheme === "dark" ? "light" : "dark");
    } else {
      // Currently pinned → go back to system default
      setPinnedTheme(null);
    }
  }, [pinnedTheme, systemTheme]);

  return (
    <ThemeContext.Provider value={{ theme, systemTheme, isSystemDefault, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
