import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NotificationProvider } from "@/providers/notification-provider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DSI Connect",
  description: "Enterprise Resource Platform — Disruptive Solutions Inc.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "DSI Connect",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/disruptive.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#E33636",   // matches mobile header + brand color
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* iOS icon — explicit link tags Safari reads first */}
        <link rel="apple-touch-icon" href="/icons/disruptive.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/disruptive.png" />

        {/* PWA: hide browser chrome when launched from home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="DSI Connect" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F8FAFC]`}
      >
        <NotificationProvider>
          {children}
          <Toaster
            position="top-right"
            expand={false}
            theme="light"
            className="font-sans"
            toastOptions={{
              style: {
                background: "#FFFFFF",
                border: "1px solid #F1F5F9",
                color: "#0F172A",
                borderRadius: "1rem",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              },
            }}
          />
        </NotificationProvider>
      </body>
    </html>
  );
}