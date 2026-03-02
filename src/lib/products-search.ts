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
  body_html?: string;
  tags?: string[];
  variants?: ProductVariant[];
  images?: ProductImage[];
  vendor?: string;
  product_type?: string;
}

const SYNONYMS: Record<string, string[]> = {
  jumper: ["strik", "trøjer", "cardigan", "bluse"],
  sweater: ["strik", "trøjer", "cardigan"],
  knitwear: ["strik", "trøjer"],
  cardigan: ["cardigan", "strik"],
  hat: ["hue"],
  mittens: ["luffer", "handsker", "vanter"],
  gloves: ["handsker", "luffer"],
  shoes: ["sko", "futter", "støvler"],
  slippers: ["futter", "hjemmefutter"],
  pants: ["bukser", "leggins"],
  trousers: ["bukser"],
  dress: ["kjole"],
  bag: ["taske", "rygsæk"],
  backpack: ["rygsæk"],
  blanket: ["tæppe", "uld"],
  wool: ["uld", "merino", "alpaca"],
  alpaca: ["alpaca", "alpaka"],
  cashmere: ["cashmere"],
  silk: ["silke"],
  fur: ["pels", "skind"],
  vest: ["vest", "pels vest"],
  baby: ["baby", "babytøj"],
  onesie: ["baby", "bodystocking"],
  "key ring": ["nøglering"],
  clutch: ["clutch", "taske"],
};

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

function expandQuery(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const expanded = new Set<string>(words);
  for (const word of words) {
    const synonyms = SYNONYMS[word];
    if (synonyms) {
      for (const s of synonyms) {
        expanded.add(s);
      }
    }
  }
  // Also check multi-word synonym keys (e.g. "key ring")
  const q = query.toLowerCase();
  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    if (key.includes(" ") && containsWord(q, key)) {
      for (const s of synonyms) {
        expanded.add(s);
      }
    }
  }
  return Array.from(expanded);
}

function scoreProduct(product: Product, query: string): number {
  const terms = expandQuery(query);
  let score = 0;

  const title = (product.title ?? "").toLowerCase();
  const productType = (product.product_type ?? "").toLowerCase();
  const vendor = (product.vendor ?? "").toLowerCase();
  const tags = (product.tags ?? []).map((t) => t.toLowerCase());
  const bodyHtml = (product.body_html ?? "").toLowerCase();

  for (const term of terms) {
    if (containsWord(title, term)) score += 10;
    if (tags.some((tag) => containsWord(tag, term))) score += 5;
    if (containsWord(productType, term)) score += 3;
    if (containsWord(vendor, term)) score += 2;
    if (containsWord(bodyHtml, term)) score += 1;
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
