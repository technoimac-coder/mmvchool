import type { Metadata } from "next";
import { Prompt, Sarabun } from "next/font/google";
import type { Viewport } from "next";
import "./globals.css";

const promptFont = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-prompt'
});

export const metadata: Metadata = {
  title: "ระบบสารสนเทศบริหารงานโรงเรียน | Smart School MIS & e-Service",
  description: "ระบบสำนักงานอิเล็กทรอนิกส์สำหรับโรงเรียน ครอบคลุมระบบลา ไปราชการ ขอใช้รถ จองห้องประชุม แจ้งซ่อม จัดสอนแทน ผลงานบุคลากร และแผนการสอน",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: '#0b1f3a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={promptFont.className}>
      <body className="min-h-full bg-slate-100 text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
