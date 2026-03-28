import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/AuthContext";

export const metadata: Metadata = {
  title: "Bayanihan — Community-Driven Urban Sustainability",
  description: "Citizens are the city's eyes. Every problem reported is a step toward a greener, smarter community.",
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
