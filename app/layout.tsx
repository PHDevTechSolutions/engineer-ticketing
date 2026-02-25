import type { Metadata, Viewport } from "next"; // Added Viewport import
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

// 1. Setup metadata for PWA/App mode
export const metadata: Metadata = {
  title: "engiconnect Portal",
  description: "Engineering Ticketing and Site Visit Management",
  manifest: "/manifest.json", // Links to your manifest file
  appleWebApp: {
    capable: true,
    title: "engiconnect",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/disruptive.png", // The icon for your iOS home screen
  },
};

// 2. Setup the theme color for the mobile browser address bar
export const viewport: Viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents auto-zoom on input fields in iOS
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Force the app to open in full screen when saved to home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F9FAFA]`}
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
                background: '#FFFFFF',
                border: '1px solid rgba(0,0,0,0.05)',
                color: '#121212',
                borderRadius: '0px', 
              }
            }}
          />
        </NotificationProvider>
      </body>
    </html>
  );
}