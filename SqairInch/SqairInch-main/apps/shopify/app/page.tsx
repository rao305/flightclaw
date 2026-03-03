import { sessionStorage } from "@/lib/session-storage";
import { redirect } from "next/navigation";

interface SearchParams {
  shop?: string;
  host?: string;
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const shop = searchParams.shop;
  const host = searchParams.host;

  if (!shop) {
    // Dev: show a helpful message instead of redirecting to /api/auth with empty shop
    return (
      <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: "40rem" }}>
        <h1>Sqairinch Admin</h1>
        <p>
          This is a Shopify app. Open it with a shop parameter so the app knows which store you’re
          using.
        </p>
        <p>
          <strong>Option 1 (recommended):</strong> Use the Shopify CLI and run{" "}
          <code style={{ background: "#eee", padding: "0.2rem 0.4rem" }}>shopify app dev</code>. It
          will give you a URL that includes <code>?shop=your-store.myshopify.com</code>.
        </p>
        <p>
          <strong>Option 2:</strong> Visit this URL with your dev store domain:{" "}
          <code style={{ background: "#eee", padding: "0.2rem 0.4rem" }}>
            http://localhost:3002/?shop=your-store.myshopify.com
          </code>
        </p>
      </main>
    );
  }

  // Check if a session exists for this shop
  const sessions = sessionStorage.findSessionsByShop(shop);
  if (sessions.length === 0) {
    redirect(`/api/auth?shop=${encodeURIComponent(shop)}`);
  }

  const apiKey = process.env.SHOPIFY_API_KEY ?? "";

  return (
    <>
      {/* App Bridge config — must be before any App Bridge calls */}
      <meta name="shopify-api-key" content={apiKey} />
      <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
        <h1>
          Sqairinch is installed on <code>{shop}</code>
        </h1>
        <p>Virtual try-on is ready. Configure your widget settings below.</p>
      </main>
    </>
  );
}
