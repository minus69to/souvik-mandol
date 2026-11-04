import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CanvasRoot from "../components/three/CanvasRoot";
import PaperBackground from "../components/fx/PaperBackground";
import CursorFX from "../components/fx/CursorFX";
import FxBoundary from "../components/fx/FxBoundary";
import { portfolioData } from "../data/portfolioData";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const { personal } = portfolioData;
const DESCRIPTION =
  "Software engineer at BRTC, BUET building Dhaka's adaptive traffic signal platform. BUET CSE graduate researching machine learning, LLM agents and HCI. Open to research collaborations.";

export const metadata = {
  title: `${personal.firstName} ${personal.lastName} | ${personal.tagline}`,
  description: DESCRIPTION,
  openGraph: {
    title: `${personal.firstName} ${personal.lastName} | ${personal.tagline}`,
    description: DESCRIPTION,
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Decide before first paint whether the intro curtain should show (once per session, never under reduced motion). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(sessionStorage.getItem('intro-done')||matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('no-intro')}else{sessionStorage.setItem('intro-done','1')}}catch(e){document.documentElement.classList.add('no-intro')}",
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased text-black`}>
        <FxBoundary><PaperBackground /></FxBoundary>
        <FxBoundary><CanvasRoot /></FxBoundary>
        <FxBoundary><CursorFX /></FxBoundary>
        {children}
      </body>
    </html>
  );
}
