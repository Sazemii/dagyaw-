import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/AuthContext";

export const metadata: Metadata = {
  title: "Dagyaw — Community-Driven Urban Sustainability",
  description:
    "Citizens are the city's eyes. Every problem reported is a step toward a greener, smarter community.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Dagyaw — Community-Driven Urban Sustainability",
    description:
      "Citizens are the city's eyes. Every problem reported is a step toward a greener, smarter community.",
    images: [{ url: "/android-chrome-512x512.png", width: 512, height: 512 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
