import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas",
  description: "Gerenciador de arquivos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
