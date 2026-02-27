import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { searchProducts } from "@/lib/products-search";

// Cache FAQ content at module initialization to avoid repeated file reads
const faqContent = readFileSync(
  join(process.cwd(), "src", "lib", "policy-faq.md"),
  "utf-8"
);

function getFaqSection(section: "shipping" | "returns" | "care"): string {
  const headingMap = {
    shipping: "## Shipping",
    returns: "## Returns & Refunds",
    care: "## Washing & Care",
  };

  const heading = headingMap[section];
  const startIndex = faqContent.indexOf(heading);
  if (startIndex === -1) return "";

  // Find the next ## heading after this one (or end of file)
  const afterHeading = faqContent.indexOf("\n## ", startIndex + heading.length);
  const sectionContent =
    afterHeading === -1
      ? faqContent.slice(startIndex)
      : faqContent.slice(startIndex, afterHeading);

  // Return without the heading line itself, trimmed
  return sectionContent.replace(heading, "").trim();
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message: string = (body.message ?? "").toLowerCase();

  // Escalation intent
  const escalationKeywords = [
    "human",
    "agent",
    "support",
    "contact",
    "email",
    "call",
  ];
  if (escalationKeywords.some((kw) => message.includes(kw))) {
    return NextResponse.json({
      reply:
        "I understand you'd like to speak with someone from our team. Please fill in the form below and we'll get back to you as soon as possible — usually within one business day.",
      ui: { kind: "escalation_form" },
    });
  }

  // Policy intents
  if (message.includes("ship")) {
    return NextResponse.json({
      reply: getFaqSection("shipping"),
    });
  }

  if (
    message.includes("return") ||
    message.includes("refund") ||
    message.includes("exchange")
  ) {
    return NextResponse.json({
      reply: getFaqSection("returns"),
    });
  }

  if (
    message.includes("wash") ||
    message.includes("care") ||
    message.includes("clean") ||
    message.includes("laundry") ||
    message.includes("iron")
  ) {
    return NextResponse.json({
      reply: getFaqSection("care"),
    });
  }

  // Product intent
  const productKeywords = [
    "alpaca",
    "silk",
    "wool",
    "cashmere",
    "baby",
    "kids",
    "child",
    "price",
    "recommend",
    "gift",
    "cardigan",
    "onesie",
    "hat",
    "shoes",
  ];
  if (productKeywords.some((kw) => message.includes(kw))) {
    const { results, catalogMissing } = searchProducts(message);
    if (catalogMissing) {
      return NextResponse.json({
        reply:
          "I'd love to recommend some products! To enable product search, please add a Shopify `products.json` export at `src/lib/products.json` on your local machine.",
      });
    }
    if (results.length === 0) {
      return NextResponse.json({
        reply:
          "I couldn't find any products matching your query. Feel free to browse our full collection at https://www.littlellama.dk.",
      });
    }
    const BASE_URL = "https://www.littlellama.dk/en-eu/products";
    const bullets = results
      .map((p) => {
        const priceStr = p.price ? ` — ${p.price}` : "";
        return `• [${p.title}](${BASE_URL}/${p.handle})${priceStr}`;
      })
      .join("\n");
    return NextResponse.json({
      reply: `Here are some products that might interest you:\n\n${bullets}`,
    });
  }

  // Fallback
  return NextResponse.json({
    reply:
      "Hi there! I can help you with questions about shipping, returns & refunds, or washing & care instructions. You can also type 'contact' if you'd like to reach our support team.",
  });
}
