import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import NodeineWelcome from "./components/nodeine-welcome";
import MessageDraftsProvider from "./components/message-drafts-provider";
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
  title: "NODEINE — The TRINE Archive",
  description:
    "A visual archive of AI-generated worlds, characters, fashion studies, street mythologies, and animated futures.",
  applicationName: "NODEINE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MessageDraftsProvider>{children}</MessageDraftsProvider>
        <NodeineWelcome />
        <Toaster position="top-center" theme="dark" richColors closeButton />
      </body>
    </html>
  );
}
