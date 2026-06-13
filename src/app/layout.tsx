import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import { DemoPhoneFrame } from "@/components/demo-phone-frame";

import { Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  variable: "--font-nunito",
  display: "swap",
});

const alegreya = localFont({
  src: "../../public/fonts/Alegreya-VariableFont_wght.ttf",
  variable: "--font-alegreya",
  display: "swap",
});

export const viewport = {
  themeColor: "#FCF9F8",
};

export const metadata: Metadata = {
  title: "Scoop",
  description: "Családi receptkönyv",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Scoop",
  },
  icons: {
    icon: [
      { url: "/favicon.svg?v=2", type: "image/svg+xml" },
      { url: "/icon-512.png?v=2", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu" className={`${nunito.variable} ${alegreya.variable}`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon.png?v=2" />
      </head>
      <body className="font-sans antialiased text-text-primary">
        <Providers vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""}>
          <DemoPhoneFrame>
            <div className="app-container">
              {children}
            </div>
          </DemoPhoneFrame>
          <Toaster
            theme="light"
            position="top-center"
            toastOptions={{
              className: "font-sans font-bold !border-2 !border-[#E5E2E1] !shadow-[0_4px_0_#E5E2E1] !rounded-2xl !text-base !px-5 !py-4",
              style: {
                background: "#FAF7F6",
                color: "#1C1B1B",
              }
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
