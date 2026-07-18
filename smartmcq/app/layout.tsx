import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrepFlow - MCQ Practice",
  description: "BCS & Bank Exam Preparation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn">
      <body className="bg-[#FFF8E7] text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}