"use client";

import { useEffect, useState } from "react";

export default function HeaderShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300 motion-reduce:transition-none ${
        scrolled
          ? "bg-white/85 backdrop-blur-md border-b border-gray-200 shadow-card"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      {children}
    </header>
  );
}
