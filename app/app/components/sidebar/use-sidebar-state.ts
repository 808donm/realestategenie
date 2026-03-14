"use client";

import { useState, useEffect, useCallback } from "react";

const COLLAPSED_KEY = "sidebar-collapsed";
const SECTIONS_KEY = "sidebar-sections";

export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "my-day": true,
    clients: true,
    deals: true,
    listings: true,
  });
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    try {
      const storedCollapsed = localStorage.getItem(COLLAPSED_KEY);
      if (storedCollapsed !== null) {
        setIsCollapsed(JSON.parse(storedCollapsed));
      }

      const storedSections = localStorage.getItem(SECTIONS_KEY);
      if (storedSections !== null) {
        setOpenSections(JSON.parse(storedSections));
      }
    } catch {
      // localStorage unavailable or corrupt — use defaults
    }
    setHydrated(true);
  }, []);

  // Persist collapse state
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(isCollapsed));
    } catch {
      // ignore
    }
  }, [isCollapsed, hydrated]);

  // Persist section state
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(openSections));
    } catch {
      // ignore
    }
  }, [openSections, hydrated]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  return {
    isCollapsed,
    toggleCollapse,
    openSections,
    toggleSection,
    isMobileMoreOpen,
    setIsMobileMoreOpen,
    hydrated,
  };
}
