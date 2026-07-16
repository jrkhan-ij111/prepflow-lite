import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrepFlow Lite – MCQ Practice",
  description: "Free MCQ practice app using DeepSeek AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body className="min-h-screen bg-[#FFF8E7]">{children}</body>
    </html>
  );
}