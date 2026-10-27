import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { SITE } from "@/lib/constants";
import { getSiteUrl } from "@/lib/config";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE.name} — Find your next pharma job`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  category: "careers",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — Find your next pharma job`,
    description: SITE.description,
    url: siteUrl,
  },
  twitter: {
    card: "summary",
    title: `${SITE.name} — Find your next pharma job`,
    description: SITE.description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
