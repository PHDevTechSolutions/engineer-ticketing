import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 1. Import your New Notification Provider
import { NotificationProvider } from "@/providers/notification-provider";
// 2. Import the Toaster (Requirement for Sonner notifications)
import { Toaster } from "sonner";
// 3. Import Debug Utility
import { SystemClock } from "@/components/debug/system-clock";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Engineering Ticketing System",
  description: "Corporate Shop Drawing & Protocol Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F9FAFA]`}
      >
        {/* Debug: Real-time System Clock for Form Submission Alignment */}
        <SystemClock />

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
                borderRadius: '0px', // Corporate rigid edge
              }
            }}
          />
        </NotificationProvider>
      </body>
    </html>
  );
}