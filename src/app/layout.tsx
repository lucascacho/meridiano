import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Meridiano — zonas horarias en un vistazo",
  description:
    "Compara ciudades, encuentra el hueco laboral y comparte la hora de la llamada. Pensado para el móvil.",
  applicationName: "Meridiano",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efeae2" },
    { media: "(prefers-color-scheme: dark)", color: "#141511" },
  ],
};

const themeScript = `(function(){try{var t=localStorage.getItem("meridiano-theme");var dark=t==="dark"||((t==="system"||!t)&&matchMedia("(prefers-color-scheme: dark)").matches);var el=document.documentElement;el.dataset.theme=dark?"dark":"light";el.classList.toggle("dark",dark);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-dvh overflow-hidden bg-background text-foreground">{children}</body>
    </html>
  );
}
