/**
 * Database Query Utilities
 * 
 * Helper functions for querying products and categories
 */

import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm';
import { db } from './index';
import { products, categories, productImages, productCategories, productAttributes, productSizeInventory } from './schema';
import type { Product, ProductCategory } from '../types';
import type { Product as DBProduct, ProductImage, ProductAttribute, ProductSizeInventory } from './schema';
import type { Category } from './schema';

interface ProductQueryResult {
  product: DBProduct;
  image: ProductImage | null;
  category: Category | null;
  productCategory: { id: string; productId: string; categoryId: string } | null;
  attribute: ProductAttribute | null;
  sizeInventory: ProductSizeInventory | null;
}

interface CategoryInfo {
  categoryId: string;
  name: string;
  slug: string;
}

/**
 * Ensure image URL is properly encoded (but don't double-encode)
 * URLs from bunny.ts are already encoded using encodeURIComponent
 * encodeURIComponent doesn't encode parentheses () as they're valid in URLs
 * We preserve the encoding as returned by bunny.ts
 */
function encodeImageUrl(url: string): string {
  // URLs from bunny.ts are already properly encoded
  // encodeURIComponent handles spaces and most special chars, but not parentheses
  // Parentheses are valid in URLs per RFC 3986, so we keep them as-is
  return url;
}

/** Letter size order (smallest to largest) for apparel sizing */
const LETTER_SIZE_ORDER: Record<string, number> = {
  'XXS': 0, 'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5,
  'XXL': 6, '2XL': 6, '3XL': 7, '4XL': 8,
};

/** Sort size strings smallest to largest (numeric, letter, then One Size) */
function sortSizesByOrder(
  list: { size: string; quantity: number }[]
): { size: string; quantity: number }[] {
  return [...list].sort((a, b) => {
    const sa = a.size.trim();
    const sb = b.size.trim();
    if (sa.toLowerCase() === 'one size' && sb.toLowerCase() !== 'one size') return 1;
    if (sb.toLowerCase() === 'one size' && sa.toLowerCase() !== 'one size') return -1;
    if (sa.toLowerCase() === 'one size' && sb.toLowerCase() === 'one size') return 0;

    const numA = parseFloat(sa.replace(/[^\d.]/g, ''));
    const numB = parseFloat(sb.replace(/[^\d.]/g, ''));
    const aIsNum = !Number.isNaN(numA) && sa.match(/\d/);
    const bIsNum = !Number.isNaN(numB) && sb.match(/\d/);

    if (aIsNum && bIsNum) return numA - numB;
    if (aIsNum && !bIsNum) return -1;
    if (!aIsNum && bIsNum) return 1;

    const orderA = LETTER_SIZE_ORDER[sa.toUpperCase()] ?? 999;
    const orderB = LETTER_SIZE_ORDER[sb.toUpperCase()] ?? 999;
    return orderA - orderB;
  });
}

/**
 * Format database product to application Product type
 */
function formatProduct(
  dbProduct: DBProduct,
  images: ProductImage[],
  categories: CategoryInfo[],
  attributes: ProductAttribute[],
  sizeInventoryList: ProductSizeInventory[]
): Product {
  const primaryImage = images.find(img => img.isPrimary) || images[0];
  
  return {
    id: dbProduct.id,
    databaseId: parseInt(dbProduct.id) || 0, // Use id as databaseId for now
    name: dbProduct.name,
    slug: dbProduct.slug,
    description: dbProduct.description || undefined,
    shortDescription: dbProduct.shortDescription || undefined,
    price: dbProduct.price ? `$${dbProduct.price}` : undefined,
    regularPrice: dbProduct.regularPrice ? `$${dbProduct.regularPrice}` : undefined,
    salePrice: dbProduct.salePrice ? `$${dbProduct.salePrice}` : undefined,
    onSale: dbProduct.onSale || false,
    stockStatus: dbProduct.stockStatus || 'IN_STOCK',
    stockQuantity: dbProduct.stockQuantity || undefined,
    measurements: dbProduct.measurements || undefined,
    materials: dbProduct.materials || undefined,
    features: dbProduct.features || undefined,
    details: dbProduct.details || undefined,
    stripeCheckoutUrl: dbProduct.stripeCheckoutUrl || null,
    image: primaryImage ? {
      sourceUrl: encodeImageUrl(primaryImage.imageUrl),
      altText: primaryImage.altText || undefined,
    } : undefined,
    galleryImages: images.length > 0 ? {
      nodes: images.map(img => ({
        sourceUrl: encodeImageUrl(img.imageUrl),
        altText: img.altText || undefined,
      })),
    } : undefined,
    productCategories: categories.length > 0 ? {
      nodes: categories.map(cat => ({
        id: cat.categoryId,
        name: cat.name,
        slug: cat.slug,
      })),
    } : undefined,
    attributes: attributes.length > 0 ? {
      nodes: attributes.map(attr => ({
        id: attr.id,
        name: attr.name,
        options: JSON.parse(attr.options || '[]'),
      })),
    } : undefined,
    sizes: sizeInventoryList.length > 0
      ? sortSizesByOrder(sizeInventoryList.map(si => ({ size: si.size, quantity: si.quantity })))
      : undefined,
  };
}

/**
 * Get all products with optional category filter
 */
export async function getAllProducts(categorySlug?: string): Promise<Product[]> {
  // If filtering by category, first get product IDs that belong to that category
  let productIdsInCategory: string[] | undefined;
  
  if (categorySlug) {
    // Get the category ID
    const categoryResult = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, categorySlug))
      .limit(1);
    
    if (categoryResult.length === 0) {
      // Category doesn't exist, return empty array
      return [];
    }
    
    const categoryId = categoryResult[0].id;
    
    // Get all product IDs that belong to this category
    const productCategoryResults = await db
      .select({ productId: productCategories.productId })
      .from(productCategories)
      .where(eq(productCategories.categoryId, categoryId));
    
    productIdsInCategory = productCategoryResults.map(r => r.productId);
    
    // If no products in this category, return empty array
    if (productIdsInCategory.length === 0) {
      return [];
    }
  }

  // Build base query
  const baseQuery = db
    .select({
      product: products,
      image: productImages,
      category: categories,
      productCategory: productCategories,
      attribute: productAttributes,
      sizeInventory: productSizeInventory,
    })
    .from(products)
    .leftJoin(productImages, eq(products.id, productImages.productId))
    .leftJoin(productCategories, eq(products.id, productCategories.productId))
    .leftJoin(categories, eq(productCategories.categoryId, categories.id))
    .leftJoin(productAttributes, eq(products.id, productAttributes.productId))
    .leftJoin(productSizeInventory, eq(products.id, productSizeInventory.productId));

  // Apply category filter if provided (filter by product IDs)
  const results: ProductQueryResult[] = categorySlug && productIdsInCategory
    ? await baseQuery.where(inArray(products.id, productIdsInCategory)).orderBy(desc(products.createdAt))
    : await baseQuery.orderBy(desc(products.createdAt));

  // Group results by product
  const productMap = new Map<string, {
    product: DBProduct;
    images: ProductImage[];
    categories: CategoryInfo[];
    attributes: ProductAttribute[];
    sizeInventory: ProductSizeInventory[];
  }>();

  for (const row of results) {
    const productId = row.product.id;
    
    if (!productMap.has(productId)) {
      productMap.set(productId, {
        product: row.product,
        images: [],
        categories: [],
        attributes: [],
        sizeInventory: [],
      });
    }

    const entry = productMap.get(productId)!;

    if (row.image && !entry.images.find(img => img.id === row.image!.id)) {
      entry.images.push(row.image);
    }

    if (row.category && !entry.categories.find(cat => cat.categoryId === row.category!.id)) {
      entry.categories.push({
        categoryId: row.category.id,
        name: row.category.name,
        slug: row.category.slug,
      });
    }

    if (row.attribute && !entry.attributes.find(attr => attr.id === row.attribute!.id)) {
      entry.attributes.push(row.attribute);
    }

    if (row.sizeInventory && !entry.sizeInventory.find(si => si.id === row.sizeInventory!.id)) {
      entry.sizeInventory.push(row.sizeInventory);
    }
  }

  // Convert to products array
  const productsList = Array.from(productMap.values()).map(({ product, images, categories, attributes, sizeInventory }) =>
    formatProduct(product, images, categories, attributes, sizeInventory)
  );

  // Sort products by type order: jackets, hoodies, logo tees, other tees, denims, beanies, masks
  function getProductTypeOrder(productName: string): number {
    const nameLower = productName.toLowerCase();
    
    // Order: 1. Jackets, 2. Hoodies, 3. Logo tees, 4. Other tees, 5. Denims, 6. Beanies, 7. Masks
    if (nameLower.includes('jacket')) return 1;
    if (nameLower.includes('hoodie')) return 2;
    if (nameLower.includes('logo') && (nameLower.includes('tee') || nameLower.includes('t-shirt') || nameLower.includes('shirt'))) return 3;
    if (nameLower.includes('tee') || nameLower.includes('t-shirt') || nameLower.includes('shirt')) return 4;
    if (nameLower.includes('jeans') || nameLower.includes('denim')) return 5;
    if (nameLower.includes('beanie')) return 6;
    if (nameLower.includes('mask') || nameLower.includes('therma')) return 7;
    
    // Default order for unmatched products
    return 99;
  }

  // Sort products by type order, then by name
  productsList.sort((a, b) => {
    const orderA = getProductTypeOrder(a.name);
    const orderB = getProductTypeOrder(b.name);
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Special handling for jackets: black/white first, blue second, black last
    if (orderA === 1) { // Both are jackets
      const aNameLower = a.name.toLowerCase();
      const bNameLower = b.name.toLowerCase();
      
      // Get jacket priority: 1 = black/white, 2 = blue, 3 = black only, 4 = other
      function getJacketPriority(name: string): number {
        const nameLower = name.toLowerCase();
        const hasBlack = nameLower.includes('black');
        const hasWhite = nameLower.includes('white');
        const hasBlue = nameLower.includes('blue');
        
        if ((hasBlack && hasWhite) || (hasBlack && nameLower.includes('blackwhite'))) return 1; // Black/white first
        if (hasBlue) return 2; // Blue second
        if (hasBlack && !hasWhite) return 3; // Black only last
        return 4; // Other jackets
      }
      
      const priorityA = getJacketPriority(a.name);
      const priorityB = getJacketPriority(b.name);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
    }
    
    // If same order, sort alphabetically by name
    return a.name.localeCompare(b.name);
  });

  return productsList;
}

/**
 * Get product by slug
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const results = await db
    .select({
      product: products,
      image: productImages,
      category: categories,
      productCategory: productCategories,
      attribute: productAttributes,
      sizeInventory: productSizeInventory,
    })
    .from(products)
    .where(eq(products.slug, slug))
    .leftJoin(productImages, eq(products.id, productImages.productId))
    .leftJoin(productCategories, eq(products.id, productCategories.productId))
    .leftJoin(categories, eq(productCategories.categoryId, categories.id))
    .leftJoin(productAttributes, eq(products.id, productAttributes.productId))
    .leftJoin(productSizeInventory, eq(products.id, productSizeInventory.productId));

  if (results.length === 0) {
    return null;
  }

  // Group results (same as getAllProducts)
  const product = results[0].product;
  const images: ProductImage[] = [];
  const categoryInfos: CategoryInfo[] = [];
  const attributeList: ProductAttribute[] = [];
  const sizeInventoryList: ProductSizeInventory[] = [];

  for (const row of results) {
    if (row.image && !images.find(img => img.id === row.image!.id)) {
      images.push(row.image);
    }
    if (row.category && !categoryInfos.find(cat => cat.categoryId === row.category!.id)) {
      categoryInfos.push({
        categoryId: row.category.id,
        name: row.category.name,
        slug: row.category.slug,
      });
    }
    if (row.attribute && !attributeList.find(attr => attr.id === row.attribute!.id)) {
      attributeList.push(row.attribute);
    }
    if (row.sizeInventory && !sizeInventoryList.find(si => si.id === row.sizeInventory!.id)) {
      sizeInventoryList.push(row.sizeInventory);
    }
  }

  return formatProduct(product, images, categoryInfos, attributeList, sizeInventoryList);
}

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<ProductCategory[]> {
  const results = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return results.map(cat => ({
    id: cat.id,
    databaseId: parseInt(cat.id) || 0,
    name: cat.name,
    slug: cat.slug,
    description: cat.description || undefined,
    image: cat.imageUrl ? {
      sourceUrl: cat.imageUrl,
      altText: cat.imageAlt || undefined,
    } : undefined,
  }));
}

/**
 * Get Stripe checkout URL for a product
 */
export async function getProductStripeUrl(productId: string): Promise<string | null> {
  const result = await db
    .select({ stripeCheckoutUrl: products.stripeCheckoutUrl })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  return result[0]?.stripeCheckoutUrl || null;
}
