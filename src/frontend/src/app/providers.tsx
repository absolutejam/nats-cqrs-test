"use client";
import React from "react";
import { ThemeProvider, useTheme } from "next-themes";

export function Providers({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactNode {
  return <ThemeProvider attribute="class">{children}</ThemeProvider>;
}
