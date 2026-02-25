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
  title: "engiconnect Portal",
  description: "Engineering Ticketing and Site Visit Management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "engiconnect",
    statusBarStyle: "default", // 'default' usually works better for visibility
  },
  icons: {
    // This tells iOS which image to use for the "Add to Home Screen" icon
    apple: "/icons/disruptive.png", 
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A", // Your Navy Brand Color
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, 
  userScalable: false, // Prevents accidental zooming on mobile
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* iOS ICON FIX: Adding the explicit apple-touch-icon link */}
        <link rel="apple-touch-icon" href="/icons/disruptive.png" />
        {/* This makes the app feel like a real iPhone app (hides browser bars) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F8FAFC]`}
      >
        <NotificationProvider>
          {children}
          {/* Updated Toaster to match your new rounded, clean design */}
          <Toaster 
            position="top-right" 
            expand={false} 
            theme="light"
            className="font-sans"
            toastOptions={{
              style: {
                background: '#FFFFFF',
                border: '1px solid #F1F5F9',
                color: '#0F172A',
                borderRadius: '1rem', // Match your new rounded UI
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              }
            }}
          />
        </NotificationProvider>
      </body>
    </html>
  );
}