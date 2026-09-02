import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jewellos | Match Studio",
  description: "Thoughtful jewellery pairings, selected from the Jewellos inventory."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
