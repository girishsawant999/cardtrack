import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/layout/theme-provider";
import "./globals.css";
import { cn } from "@/lib/utils";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CardTrack — Credit Card Bill Tracker",
    template: "%s | CardTrack",
  },
  description:
    "Track your credit card bills effortlessly. Auto-detect statements from email, get due date reminders, and never miss a payment.",
  manifest: "/manifest.json",
  icons: [
    { rel: "icon", url: "/icons/icon.svg", type: "image/svg+xml" },
    { rel: "apple-touch-icon", url: "/icons/icon-192x192.png" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CardTrack",
  },
  openGraph: {
    type: "website",
    title: "CardTrack — Credit Card Bill Tracker",
    description:
      "Track your credit card bills effortlessly. Auto-detect statements from email, get due date reminders, and never miss a payment.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1622" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(jakarta.variable, spaceGrotesk.variable, jetbrainsMono.variable, "font-sans")}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        {/* Prevent FOUC: inline script to apply stored theme immediately */}
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var root = document.documentElement;
                var meta = document.querySelector('meta[name="color-scheme"]');
                var cs = localStorage.getItem('color-scheme');
                var theme;
                if (cs === 'dark' || cs === 'light') {
                  theme = cs;
                  root.setAttribute('data-theme', cs);
                  if (cs === 'dark') {
                    root.classList.add('dark');
                  } else {
                    root.classList.remove('dark');
                  }
                  if (meta) meta.content = cs;
                } else {
                  // No pinned theme, use system
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  theme = systemDark ? 'dark' : 'light';
                  if (systemDark) {
                    root.classList.add('dark');
                  } else {
                    root.classList.remove('dark');
                  }
                  if (meta) meta.content = 'light dark';
                  root.removeAttribute('data-theme');
                }
              })();
            `,
          }}
        />
        {/* Icons are now handled by Next.js metadata */}
      </head>
      <body className="min-h-dvh bg-background text-foreground font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
