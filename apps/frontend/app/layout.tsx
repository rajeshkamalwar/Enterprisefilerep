import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Enterprise File Repository",
  description: "ERP-style internal file repository"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
