import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import { VotingProvider } from "@/lib/voting-context";
import { Providers } from "@/components/providers";
import { VoteConfirmationBar } from "@/components/vote-confirmation-bar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Force dynamic rendering - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Roadmapr - Community-Weighted Roadmap",
  description: "Submit features, vote with your reputation. The community decides what gets built.",
  openGraph: {
    title: "Roadmapr",
    description: "Community-weighted roadmap for Farcaster Protocol",
    type: "website",
    images: ["https://roadmapr-ten.vercel.app/hero.png"],
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "1",
      name: "Roadmapr",
      iconUrl: "https://roadmapr-ten.vercel.app/icon.png",
      homeUrl: "https://roadmapr-ten.vercel.app",
      splashImageUrl: "https://roadmapr-ten.vercel.app/splash.png",
      splashBackgroundColor: "#101010",
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#101010" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('theme');
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                  localStorage.setItem('theme', 'dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <VotingProvider>
            <AuthProvider>
              {children}
              <VoteConfirmationBar />
              <Toaster />
            </AuthProvider>
          </VotingProvider>
        </Providers>
      </body>
    </html>
  );
}
