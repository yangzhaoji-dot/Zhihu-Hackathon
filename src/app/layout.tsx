import type { Metadata, Viewport } from "next";
import "./globals.css";
import Script from "next/script";
import { Geist } from "next/font/google";
import { EazoProvider } from "@eazo/sdk/react";
import { cn } from "@/utils/utils";
import { Toaster } from "@/components/ui/sonner";
import { UserSyncEffect } from "@/components/user-profile/user-sync-effect";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { LocaleSyncEffect } from "@/components/i18n/locale-sync-effect";
import { AiStationDock } from "@/components/cosmos/ai-station-dock";
import { InteractionSoundscape } from "@/components/world/interaction-soundscape";
import { getServerLocale } from "@/lib/i18n/server-preference";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

const SITE_TITLE = process.env.NEXT_PUBLIC_APP_TITLE?.trim() || "Eazo App";
const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION?.trim() || "An app build by eazo.ai";

const EAZO_INSPECTOR_SRC =
  "https://cdn.eazo.ai/platform-assets/inspector.js";

const EAZO_APP_ID = process.env.EAZO_APP_ID?.trim();
const EAZO_BRAND_BANNER_SRC =
  "https://cdn.eazo.ai/branding/eazo-brand-banner.js";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: {
    icon: "https://eazo.ai/favicon.ico",
  },
  openGraph: {
    type: "website",
    siteName: "Eazo",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("h-full antialiased", "font-sans", geist.variable)}
    >
      <body
        className="h-full flex flex-col"
        data-eazo-preview-inspector-runtime=""
      >
        <I18nProvider>
          <EazoProvider>
            <LocaleSyncEffect />
            <UserSyncEffect />
            <InteractionSoundscape />
            <AiStationDock />
            {children}
            <Toaster />
          </EazoProvider>
        </I18nProvider>
        <Script
          src={EAZO_INSPECTOR_SRC}
          strategy="afterInteractive"
          data-eazo-inspector="1"
        />
        {EAZO_APP_ID && (
          <Script
            src={EAZO_BRAND_BANNER_SRC}
            strategy="afterInteractive"
            data-eazo-app-id={EAZO_APP_ID}
          />
        )}
      </body>
    </html>
  );
}
