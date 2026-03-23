import React, { useState } from "react";

export interface ProductItem {
  title: string;
  handle: string;
  price?: string;
  image?: string;
}

interface ProductCarouselProps {
  products: {
    products: ProductItem[];
  }
}

export function ProductCarousel({ products }: ProductCarouselProps) {
  const [index, setIndex] = useState(0);
  const _products = products.products;

  if (!_products || _products.length === 0) return null;

  const product = _products[index];
  const productUrl = `https://www.littlellama.dk/en-eu/products/${product.handle}`;

  return (
    <div className="mt-2 w-full">
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        {product.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={`Product image: ${product.title}`}
            className="w-full h-36 object-cover"
          />
        )}
        <div className="p-3">
          <a
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-foreground hover:underline line-clamp-2"
          >
            {product.title}
          </a>
          {product.price && (
            <p className="mt-1 text-xs text-muted-foreground">{product.price}</p>
          )}
          <a
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            View product
          </a>
        </div>
      </div>

      {products.length > 1 && (
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-full p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            aria-label="Previous product"
          >
            ←
          </button>
          <span className="text-xs text-muted-foreground">
            {index + 1} / {products.length}
          </span>
          <button
            onClick={() => setIndex((i) => Math.min(products.length - 1, i + 1))}
            disabled={index === products.length - 1}
            className="rounded-full p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            aria-label="Next product"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

export default ProductCarousel;
