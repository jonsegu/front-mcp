import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Documentation Assistant",
  description: "Chat with your project documentation through MCP"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
