import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "WON Originals | Internal Agency Management",
  description: "WON (WeOwnNothing) - Agency Management Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                var observer = new MutationObserver(function(mutations) {
                  for (var i = 0; i < mutations.length; i++) {
                    var m = mutations[i];
                    if (m.type === 'attributes' && (m.attributeName === 'bis_skin_checked' || m.attributeName === 'bis_register')) {
                      m.target.removeAttribute(m.attributeName);
                    }
                  }
                });
                observer.observe(document.documentElement, {
                  attributes: true,
                  subtree: true,
                  attributeFilter: ['bis_skin_checked', 'bis_register']
                });
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased bg-white text-slate-900 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
