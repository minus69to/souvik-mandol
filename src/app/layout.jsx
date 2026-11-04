import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CanvasRoot from "../components/three/CanvasRoot";
import { portfolioData } from "../data/portfolioData";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const { personal } = portfolioData;

export const metadata = {
  title: `${personal.firstName} ${personal.lastName} | ${personal.tagline}`,
  description:
    "Software engineer at BRTC, BUET building Dhaka's adaptive traffic signal platform. BUET CSE graduate researching machine learning, LLM agents and HCI. Open to research collaborations.",
  openGraph: {
    title: `${personal.firstName} ${personal.lastName} | ${personal.tagline}`,
    description: "Signals, systems and models, built for the real world.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-black`}>
        <CanvasRoot />
        {children}
      </body>
    </html>
  );
}
