// src/components/ThemeCustomizer.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Palette, Sun, Moon, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Theme = "slate" | "emerald" | "cyberpunk" | "rose" | "amber";

interface ThemeOption {
  id: Theme;
  name: string;
  className: string;
  previewColor: string; // Tailwind bg color class
}

const THEME_OPTIONS: ThemeOption[] = [
  { id: "slate", name: "Galactic Slate", className: "", previewColor: "bg-blue-600" },
  { id: "emerald", name: "Emerald Forest", className: "theme-emerald", previewColor: "bg-emerald-600" },
  { id: "cyberpunk", name: "Cyberpunk Violet", className: "theme-cyberpunk", previewColor: "bg-violet-500" },
  { id: "rose", name: "Rose Obsidian", className: "theme-rose", previewColor: "bg-rose-500" },
  { id: "amber", name: "Amber Gold", className: "theme-amber", previewColor: "bg-amber-500" },
];

export function ThemeCustomizer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState<Theme>("slate");
  const [isDarkMode, setIsDarkMode] = useState(false);

  const applyColorTheme = useCallback((themeId: Theme) => {
    // Remove all theme classes first
    THEME_OPTIONS.forEach(opt => {
      if (opt.className) {
        document.documentElement.classList.remove(opt.className);
      }
    });

    // Add selected theme class
    const selected = THEME_OPTIONS.find(t => t.id === themeId);
    if (selected && selected.className) {
      document.documentElement.classList.add(selected.className);
    }
  }, []);

  // Initialize theme from localStorage/document on mount
  useEffect(() => {
    // 1. Detect Dark Mode
    const hasDarkClass = document.documentElement.classList.contains("dark");
    const storedDark = localStorage.getItem("theme-dark");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const finalDark = storedDark !== null ? storedDark === "true" : (hasDarkClass || systemDark);
    
    setIsDarkMode(finalDark);
    if (finalDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // 2. Detect Color Theme
    const storedTheme = localStorage.getItem("theme-color") as Theme;
    if (storedTheme && THEME_OPTIONS.some(t => t.id === storedTheme)) {
      setActiveTheme(storedTheme);
      applyColorTheme(storedTheme);
    }
  }, [applyColorTheme]);

  const handleThemeChange = (themeId: Theme) => {
    setActiveTheme(themeId);
    applyColorTheme(themeId);
    localStorage.setItem("theme-color", themeId);
  };

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    localStorage.setItem("theme-dark", String(nextDark));
    
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 font-body">
      {/* Floating Action Card */}
      {isOpen && (
        <div className="w-72 p-4 bg-card/90 backdrop-blur-md border border-border rounded-2xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm text-foreground">Theme Sandbox</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Color Palettes Grid */}
          <div className="space-y-4">
            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-2">
                Color Palette
              </span>
              <div className="grid grid-cols-5 gap-2">
                {THEME_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    title={opt.name}
                    onClick={() => handleThemeChange(opt.id)}
                    className={cn(
                      "group relative h-10 w-10 rounded-full border-2 transition-all flex items-center justify-center shadow-sm",
                      opt.previewColor,
                      activeTheme === opt.id
                        ? "border-primary scale-110 ring-2 ring-primary/20"
                        : "border-transparent hover:scale-105"
                    )}
                  >
                    {activeTheme === opt.id && (
                      <Check className="h-5 w-5 text-white drop-shadow-md" />
                    )}
                    
                    {/* Tooltip */}
                    <span className="absolute bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground text-[10px] py-1 px-2 rounded border border-border shadow-md whitespace-nowrap z-50">
                      {opt.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dark Mode Switch */}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs font-semibold text-muted-foreground">
                Dark Mode
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDarkMode}
                className="gap-2 h-8 font-medium"
              >
                {isDarkMode ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    Light
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-blue-500" />
                    Dark
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-[10px] text-center text-muted-foreground/80 pt-1">
              Test styles to see which fits your brand best!
            </p>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={cn(
          "h-12 w-12 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all",
          isOpen ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-primary text-primary-foreground"
        )}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Palette className="h-5 w-5 animate-pulse" />}
      </Button>
    </div>
  );
}
