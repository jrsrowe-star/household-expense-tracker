import "./globals.css";
import type { Metadata } from "next";
import NavBar from "./NavBar";

export const metadata: Metadata = {
  title: "Household Expense Tracker",
  description: "Track and split Jordan & Nicole's shared monthly expenses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="main-content">{children}</main>
      </body>
    </html>
  );
}
