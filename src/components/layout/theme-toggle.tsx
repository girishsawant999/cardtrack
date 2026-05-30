"use client";

import { useTheme } from "@/components/layout/theme-provider";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, isSystemDefault, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="relative w-14 h-7.5 rounded-full bg-secondary border border-border" />
    );
  }

  return (
    <button
      id="theme-toggle"
      onClick={toggleTheme}
      className="relative w-14 h-7.5 rounded-full bg-secondary border border-border
        transition-colors duration-300 ease-out
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <div
        className={`
          absolute top-[2px] w-6 h-6 rounded-full
          flex items-center justify-center
          transition-all duration-300 ease-out
          ${theme === "dark"
            ? "left-[1.65rem] bg-primary text-primary-foreground"
            : "left-1 bg-primary text-primary-foreground"
          }
        `}
      >
        {theme === "dark" ? (
          <Moon className="w-3.5 h-3.5" />
        ) : (
          <Sun className="w-3.5 h-3.5" />
        )}
      </div>
      {!isSystemDefault && (
        <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-primary border-2 border-background" />
      )}
    </button>
  );
}
