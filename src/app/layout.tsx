import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CapacitorBridge } from "@/components/capacitor-bridge";
import { APP_NAME } from "@/lib/brand";
import { LocaleProvider } from "@/providers/locale-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} | Dashboard`,
  description: "BodyForge — daily plan for food, water and training.",
  icons: {
    icon: "/deer-logo.svg",
    apple: "/deer-logo.svg",
  },
  metadataBase: process.env.VERCEL_URL
    ? new URL(`https://${process.env.VERCEL_URL}`)
    : undefined,
  applicationName: APP_NAME,
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#121212",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("bodyforge-theme");var ok=t&&["dark","light","ocean","ember","slate"].indexOf(t)>=0;if(ok)document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <CapacitorBridge />
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
