import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider, useUser } from "../lib/AuthContext";
import Head from "next/head";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect } from "react";
import OtpModal from "@/components/OtpModal";

function AppContent({ Component, pageProps }: { Component: any; pageProps: any }) {
  const { user } = useUser();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (user && user.theme && user.theme !== theme) {
      setTheme(user.theme);
    }
  }, [user?.theme, theme, setTheme]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200 flex flex-col">
      <Head>
        <title>Your-Tube Clone</title>
      </Head>
      <Header />
      <Toaster />
      <OtpModal />
      <div className="flex flex-1 w-full min-h-[calc(100vh-57px)]">
        <Sidebar />
        <main className="flex-1 w-full min-w-0">
          <Component {...pageProps} />
        </main>
      </div>
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <AppContent Component={Component} pageProps={pageProps} />
      </ThemeProvider>
    </UserProvider>
  );
}
