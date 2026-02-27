import { readFile } from "fs/promises";
import { join } from "path";

interface ProductVariant {
  price?: string;
}

interface ProductImage {
  src?: string;
}

interface Product {
  title?: string;
  handle?: string;
  tags?: string[];
  variants?: ProductVariant[];
  images?: ProductImage[];
  vendor?: string;
  product_type?: string;
}

interface ProductCatalog {
  products: Product[];
}

export interface ProductResult {
  title: string;
  handle: string;
  price?: string;
  image?: string;
  score: number;
}

const CATALOG_PATH = join(process.cwd(), "src", "lib", "products.json");

function containsWord(text: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`).test(text);
}

function scoreProduct(product: Product, query: string): number {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  let score = 0;

  const title = (product.title ?? "").toLowerCase();
  const productType = (product.product_type ?? "").toLowerCase();
  const vendor = (product.vendor ?? "").toLowerCase();
  const tags = (product.tags ?? []).map((t) => t.toLowerCase());

  for (const word of words) {
    if (containsWord(title, word)) score += 10;
    if (tags.some((tag) => containsWord(tag, word))) score += 5;
    if (containsWord(productType, word)) score += 3;
    if (containsWord(vendor, word)) score += 2;
  }

  return score;
}

export async function searchProducts(
  query: string,
  limit = 5
): Promise<ProductResult[] | null> {
  let catalog: ProductCatalog;

  try {
    const raw = await readFile(CATALOG_PATH, "utf-8");
    catalog = JSON.parse(raw) as ProductCatalog;
  } catch {
    return null;
  }

  const products = catalog.products ?? [];

  const scored = products
    .filter((product) => product.title && product.handle)
    .map((product) => ({
      title: product.title ?? "",
      handle: product.handle ?? "",
      price: product.variants?.[0]?.price,
      image: product.images?.[0]?.src,
      score: scoreProduct(product, query),
    }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
