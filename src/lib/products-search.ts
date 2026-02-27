import { readFileSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types for the Shopify products.json export format
// ---------------------------------------------------------------------------

interface ProductVariant {
  price?: string;
}

interface ProductImage {
  src?: string;
}

interface ShopifyProduct {
  title?: string;
  handle?: string;
  tags?: string[] | string;
  vendor?: string;
  product_type?: string;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

interface ProductsFile {
  products: ShopifyProduct[];
}

export interface ProductResult {
  title: string;
  handle: string;
  price: string | null;
  image: string | null;
  score: number;
}

// ---------------------------------------------------------------------------
// Lazy-load the catalog once per process lifetime
// ---------------------------------------------------------------------------

let catalog: ShopifyProduct[] | null = null;
let catalogMissing = false;

function getCatalog(): ShopifyProduct[] | null {
  if (catalogMissing) return null;
  if (catalog !== null) return catalog;

  try {
    const raw = readFileSync(
      join(process.cwd(), "src", "lib", "products.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw) as ProductsFile;
    catalog = Array.isArray(parsed.products) ? parsed.products : [];
  } catch {
    catalogMissing = true;
    return null;
  }

  return catalog;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

function normalizeTags(tags: string[] | string | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((t) => t.toLowerCase());
  return tags
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function scoreProduct(product: ShopifyProduct, terms: string[]): number {
  const title = (product.title ?? "").toLowerCase();
  const vendor = (product.vendor ?? "").toLowerCase();
  const productType = (product.product_type ?? "").toLowerCase();
  const tags = normalizeTags(product.tags);

  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 10;
    if (tags.some((tag) => tag.includes(term))) score += 5;
    if (vendor.includes(term) || productType.includes(term)) score += 2;
  }
  return score;
}

export function searchProducts(
  query: string,
  limit = 5
): { results: ProductResult[]; catalogMissing: boolean } {
  const products = getCatalog();

  if (products === null) {
    return { results: [], catalogMissing: true };
  }

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const scored = products
    .map((p) => ({ product: p, score: scoreProduct(p, terms) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(limit, 6));

  const results: ProductResult[] = scored.map(({ product, score }) => ({
    title: product.title ?? "",
    handle: product.handle ?? "",
    price: product.variants?.[0]?.price ?? null,
    image: product.images?.[0]?.src ?? null,
    score,
  }));

  return { results, catalogMissing: false };
}
