import "server-only";
// Product images for shoes, from an affiliate feed. Nothing here runs until the credentials exist, and if a
// lookup fails or returns nothing the app simply draws the shoe instead. No scraping, no hotlinking a
// retailer without a relationship: the only images used are ones a feed licensed to us.
//
// AvantLink (Running Warehouse and most running retailers) is the first provider. Its Product API answers
// with, among other fields, Image URL, Thumbnail Image URL, Brand Name and Buy Link.
// Docs: https://support.avantlink.com/hc/en-us/articles/203644699-Affiliate-Technical-Integration

export type ShoeImage = { imageUrl: string; buyUrl: string | null; source: "avantlink" };

const API = "https://classic.avantlink.com/api.php";

export function shoeImagesEnabled() {
  return !!(process.env.AVANTLINK_AFFILIATE_ID && process.env.AVANTLINK_API_KEY);
}

/**
 * Best effort: the first product whose name looks like this brand and model. Never throws, never blocks a
 * save. A null answer means "draw it", which is always a valid outcome.
 */
export async function findShoeImage(brand: string, model: string): Promise<ShoeImage | null> {
  if (!shoeImagesEnabled()) return null;
  const q = new URLSearchParams({
    module: "ProductSearch",
    affiliate_id: process.env.AVANTLINK_AFFILIATE_ID!,
    auth_key: process.env.AVANTLINK_API_KEY!,
    search_term: `${brand} ${model}`,
    search_results_count: "5",
    search_results_fields: "Product Name|Brand Name|Thumbnail URL|Medium Image URL|Buy URL",
    output: "json",
    ...(process.env.AVANTLINK_MERCHANT_IDS ? { merchant_ids: process.env.AVANTLINK_MERCHANT_IDS } : {}),
  });
  try {
    const r = await fetch(`${API}?${q}`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const rows = (await r.json()) as Record<string, string>[];
    if (!Array.isArray(rows) || !rows.length) return null;
    const want = `${brand} ${model}`.toLowerCase().split(/\s+/).filter(Boolean);
    const hit = rows.find((row) => {
      const name = (row["Product Name"] ?? "").toLowerCase();
      return want.every((w) => name.includes(w));
    }) ?? rows[0]!;
    const imageUrl = hit["Medium Image URL"] || hit["Thumbnail URL"] || "";
    if (!imageUrl) return null;
    return { imageUrl, buyUrl: hit["Buy URL"] || null, source: "avantlink" };
  } catch {
    return null;
  }
}
