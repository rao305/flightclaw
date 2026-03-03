/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sqairinch/shared"],

  async headers() {
    const shop = process.env.SHOPIFY_APP_SHOP ?? "*.myshopify.com";
    return [
      {
        // Apply to all routes — Shopify Admin embeds via iframe
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors https://${shop} https://admin.shopify.com`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
