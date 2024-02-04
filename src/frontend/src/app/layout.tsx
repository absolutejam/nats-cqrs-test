import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeSwitcher } from "./theme-switcher";

import "react-toastify/dist/ReactToastify.css";
import Script from "next/script";
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NATS CQRS test",
  description: "A simple test app using NATS & SSE",
};

function TitleBar() {
  return (
    <nav className="bg-background border-border border-b">
      <div className="flex max-w-screen-xl items-center justify-between mx-auto p-4">
        <a href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
          <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
            NATS CQRS test
          </span>
        </a>

        <div className="flex flex-1 justify-end">
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  );
}

function PageNav(): React.ReactNode {
  const links = [
    { name: "Locations list", path: "/locations" },
    { name: "Create location", path: "/locations/create" },
  ];
  return (
    <nav className="bg-background py-4 border-border border-b">
      <div className="flex flex-col max-w-screen-xl items-start justify-center mx-auto p-4">
        <div className="flex gap-x-2">
          {links.map(({ name, path }) => {
            return (
              <a
                key={name}
                href={path}
                className="w-64 hover:border-gray-400 dark:hover:border-gray-700 transition-all duration-200 p-6 bg-background border border-border rounded-lg"
              >
                <h5 className="mb-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {name}
                </h5>
                <p className="font-normal lowercase text-sm text-gray-400 dark:text-gray-500">
                  {path}
                </p>
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-full bg-background w-full`}>
        <Providers>
          <TitleBar />
          <PageNav />
          {children}
        </Providers>

        <Script
          id="theme-switcher"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
    if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark')
    }
        `,
          }}
        />
      </body>
    </html>
  );
}
