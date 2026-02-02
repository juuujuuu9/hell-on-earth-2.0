/**
 * Build product page HTML. Shared by API route and middleware so
 * /products/:slug works in dev (middleware) and production (Vercel rewrite → API).
 */
import type { Product } from './types';

function stripPriceHtml(price: string): string {
  return price.replace(/<[^>]*>/g, '').trim();
}

function formatPrice(price: string | undefined): string {
  if (!price) return 'Price unavailable';
  const clean = stripPriceHtml(price);
  const m = clean.match(/(\d+\.?\d*)/);
  return m ? `${parseFloat(m[1]).toFixed(2)} USD` : clean;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildProductPageHtml(product: Product): string {
  const formattedPrice = formatPrice(product.price);
  const primaryImage = product.image;
  const imgSrc = primaryImage?.sourceUrl ?? '';
  const imgAlt = escapeHtml(primaryImage?.altText || product.name);
  const name = escapeHtml(product.name);
  const checkoutUrl = product.stripeCheckoutUrl ?? '';
  const hasSizes = product.sizes && product.sizes.length > 0;

  let cartBlock: string;
  if (!checkoutUrl) {
    cartBlock = '<p class="text-gray-500">Checkout unavailable</p>';
  } else if (hasSizes) {
    cartBlock = '<span class="block w-full px-6 py-4 text-center text-[1.5rem] bg-gray-400 text-white uppercase font-semibold cursor-not-allowed">SELECT SIZE</span>';
  } else {
    cartBlock = `<a href="${escapeHtml(checkoutUrl)}" class="block w-full px-6 py-4 text-center text-[1.5rem] bg-black text-white uppercase font-semibold hover:opacity-70 transition-opacity">+ ADD TO CART</a>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Lexend+Mega:wght@400&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://use.typekit.net/rox0jfu.css" />
  <title>${name}</title>
  <script defer src="https://cloud.umami.is/script.js" data-website-id="2e3023b6-505a-48d2-b491-0225b61304e4"></script>
</head>
<body class="min-h-screen bg-white">
  <header class="sticky top-0 z-50 bg-black border-b pl-4 pr-2 lg:px-8 h-[73px] flex items-center">
    <div class="max-w-[1920px] mx-auto flex items-center justify-between w-full">
      <nav class="hidden lg:flex items-center gap-6">
        <a href="/products" class="text-white hover:opacity-70">SHOP</a>
        <a href="/terms" class="text-white hover:opacity-70">TERMS</a>
      </nav>
      <a href="/" class="absolute left-1/2 -translate-x-1/2">
        <img src="/3d-logo-header.webp" alt="HELL ON EARTH" class="h-14 w-auto object-cover" loading="eager" />
      </a>
      <a href="/cart" class="text-white hover:opacity-70">CART</a>
    </div>
  </header>
  <main class="max-w-[1920px] mx-auto px-4 lg:px-8 py-8">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="aspect-square bg-white flex items-center justify-center">
        ${imgSrc ? `<img src="${escapeHtml(imgSrc)}" alt="${imgAlt}" class="w-full h-full object-contain" width="800" height="800" loading="eager" />` : '<span class="text-gray-400">No image</span>'}
      </div>
      <div>
        <nav class="text-sm text-gray-600 mb-4">
          <a href="/" class="hover:text-gray-900">HOME</a>
          <span class="mx-2">/</span>
          <a href="/products" class="hover:text-gray-900">SHOP</a>
          <span class="mx-2">/</span>
          <span class="text-gray-900 font-medium">${name}</span>
        </nav>
        <h1 class="text-xl font-bold uppercase text-gray-700 mb-4">${name}</h1>
        <p class="text-base tracking-wide mb-1">${escapeHtml(formattedPrice)}</p>
        <p class="text-xs text-gray-500 mb-6">VAT EXCLUDED / EXCL. SHIPPING</p>
        <div id="cart-button-wrapper" class="min-h-[52px]">
          ${cartBlock}
        </div>
        ${product.shortDescription ? `<div class="mt-6 pt-6 border-t border-gray-200 text-base leading-relaxed">${product.shortDescription}</div>` : ''}
        ${product.description ? `<div class="mt-6 pt-6 border-t border-gray-200 text-base leading-relaxed">${product.description}</div>` : ''}
      </div>
    </div>
  </main>
  <footer class="max-w-[1920px] mx-auto px-4 lg:px-8 pb-16 pt-8 border-t mt-8">
    <p class="text-center text-sm"><a href="/products" class="underline hover:opacity-70">Back to shop</a></p>
  </footer>
</body>
</html>`;
}
