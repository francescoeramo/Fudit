import type { Metadata } from "next"; import "./globals.css";
export const metadata: Metadata = { title: "Fudit", description: "Pianificazione pasti" };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="it"><body>{children}</body></html>; }
