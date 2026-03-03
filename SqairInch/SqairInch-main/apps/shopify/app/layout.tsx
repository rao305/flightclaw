import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sqairinch Admin",
  description: "Sqairinch virtual try-on — merchant dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* App Bridge loaded via CDN — no npm package required */}
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
