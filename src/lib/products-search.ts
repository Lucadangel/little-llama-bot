import { readFile } from "fs/promises";
import { join } from "path";

interface ProductVariant {
  title?: string;
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
  hat: ["hue", "babyhue", "børnehue", "hatte", "hætte"],
  cap: ["hue", "kasket"],
  beanie: ["hue", "strikket hue"],
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
  socks: ["sokker", "strømper"],
  top: ["top", "bluse", "trøje"],
  "t-shirt": ["t-shirt", "top", "bluse"],
  girl: ["pige", "pigetøj", "piger"],
  girls: ["pige", "pigetøj", "piger"],
  boy: ["dreng", "drengetøj", "drenge"],
  boys: ["dreng", "drengetøj", "drenge"],
  son: ["dreng", "drengetøj"],
  daughter: ["pige", "pigetøj"],
  children: ["børn", "babytøj", "børnetøj"],
  baby: ["baby", "babytøj", "nyfødt"],
  newborn: ["nyfødt", "baby", "babytøj"],
  toddler: ["børnetøj", "baby", "babytøj"],
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

const BOY_TAGS = ["dreng", "drengetøj", "strik til dreng", "drenge sko"];
const GIRL_TAGS = [
  "pige",
  "pigetøj",
  "strik til pige",
  "uld til piger",
  "striksæt piger",
  "pigesæt",
  "baby alpaca trøje pige",
];
const BOY_SIGNALS = ["boy", "boys", "son", "dreng", "drengetøj"];
const GIRL_SIGNALS = ["girl", "girls", "daughter", "pige", "pigetøj"];

function containsWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`\\b${escaped}\\b`).test(text)) return true;
  return text.includes(word);
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
  const queryLower = query.toLowerCase();
  const terms = expandQuery(query);
  const primaryTerms = queryLower.split(/\s+/).filter(Boolean);

  const title = (product.title ?? "").toLowerCase();
  const productType = (product.product_type ?? "").toLowerCase();
  const vendor = (product.vendor ?? "").toLowerCase();
  const tags = (product.tags ?? []).map((t) => t.toLowerCase());
  const bodyHtml = (product.body_html ?? "").toLowerCase();

  // Detect gender from query
  const queryGender = BOY_SIGNALS.some((s) => queryLower.includes(s))
    ? "boy"
    : GIRL_SIGNALS.some((s) => queryLower.includes(s))
      ? "girl"
      : null;

  // Detect product gender from tags
  const isBoyProduct = BOY_TAGS.some((bt) => tags.some((pt) => pt.includes(bt)));
  const isGirlProduct = GIRL_TAGS.some((gt) =>
    tags.some((pt) => pt.includes(gt))
  );

  // Gender exclusion: exclude opposite-gender-only products
  if (queryGender === "boy" && isGirlProduct && !isBoyProduct) return 0;
  if (queryGender === "girl" && isBoyProduct && !isGirlProduct) return 0;

  let score = 0;

  for (const term of terms) {
    if (title.includes(term)) score += 10;
    for (const tag of tags) {
      if (tag === term) {
        score += 8;
      } else if (tag.includes(term)) {
        score += 4;
      }
    }
    if (productType.includes(term)) score += 4;
    if (containsWord(vendor, term)) score += 2;
    if (containsWord(bodyHtml, term)) score += 1;
  }

  // Bonus if product_type or any tag exactly matches a primary search term
  for (const pt of primaryTerms) {
    if (productType === pt || tags.includes(pt)) {
      score += 5;
    }
  }

  // Gender bonus
  if (queryGender === "boy" && isBoyProduct) score += 8;
  if (queryGender === "girl" && isGirlProduct) score += 8;

  // Age bonus
  if (["baby", "newborn", "infant"].some((w) => queryLower.includes(w))) {
    if (["baby", "babytøj", "nyfødt"].some((t) => tags.some((pt) => pt.includes(t)))) {
      score += 5;
    }
  }
  if (["toddler", "2 years", "3 years", "4 years"].some((w) => queryLower.includes(w))) {
    if (
      tags.some((pt) => pt.includes("børnetøj")) ||
      (product.variants ?? []).some((v) =>
        /[234]\s*years?/.test((v.title ?? "").toLowerCase())
      )
    ) {
      score += 3;
    }
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
