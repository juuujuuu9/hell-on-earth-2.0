/**
 * Database Query Utilities
 * 
 * Helper functions for querying products and categories
 */

import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { db } from './index';
import { products, categories, productImages, productCategories, productAttributes } from './schema';
import type { Product, ProductCategory } from '../types';
import type { Product as DBProduct, ProductImage, ProductAttribute } from './schema';
import type { Category } from './schema';

interface ProductQueryResult {
  product: DBProduct;
  image: ProductImage | null;
  category: Category | null;
  productCategory: { id: string; productId: string; categoryId: string } | null;
  attribute: ProductAttribute | null;
}

interface CategoryInfo {
  categoryId: string;
  name: string;
  slug: string;
}

/**
 * Ensure image URL is properly encoded (but don't double-encode)
 * URLs from bunny.ts are already encoded, so we just return them as-is
 * Only encode if the URL appears to not be encoded (no % in path)
 */
function encodeImageUrl(url: string): string {
  // If URL already contains encoded characters, assume it's already encoded
  if (url.includes('%')) {
    return url;
  }
  
  // Otherwise, encode it
  try {
    const urlObj = new URL(url);
    // Only encode segments that aren't already encoded
    urlObj.pathname = urlObj.pathname
      .split('/')
      .map(segment => {
        // If segment already has encoded chars, don't encode again
        if (segment.includes('%')) {
          return segment;
        }
        return encodeURIComponent(segment);
      })
      .join('/');
    return urlObj.toString();
  } catch {
    // If URL parsing fails, check if it's already encoded
    if (url.includes('%')) {
      return url;
    }
    return encodeURI(url);
  }
}

/**
 * Format database product to application Product type
 */
function formatProduct(
  dbProduct: DBProduct,
  images: ProductImage[],
  categories: CategoryInfo[],
  attributes: ProductAttribute[]
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
    })
    .from(products)
    .leftJoin(productImages, eq(products.id, productImages.productId))
    .leftJoin(productCategories, eq(products.id, productCategories.productId))
    .leftJoin(categories, eq(productCategories.categoryId, categories.id))
    .leftJoin(productAttributes, eq(products.id, productAttributes.productId));

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
  }>();

  for (const row of results) {
    const productId = row.product.id;
    
    if (!productMap.has(productId)) {
      productMap.set(productId, {
        product: row.product,
        images: [],
        categories: [],
        attributes: [],
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
  }

  return Array.from(productMap.values()).map(({ product, images, categories, attributes }) =>
    formatProduct(product, images, categories, attributes)
  );
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
    })
    .from(products)
    .where(eq(products.slug, slug))
    .leftJoin(productImages, eq(products.id, productImages.productId))
    .leftJoin(productCategories, eq(products.id, productCategories.productId))
    .leftJoin(categories, eq(productCategories.categoryId, categories.id))
    .leftJoin(productAttributes, eq(products.id, productAttributes.productId));

  if (results.length === 0) {
    return null;
  }

  // Group results (same as getAllProducts)
  const product = results[0].product;
  const images: ProductImage[] = [];
  const categoryInfos: CategoryInfo[] = [];
  const attributeList: ProductAttribute[] = [];

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
  }

  return formatProduct(product, images, categoryInfos, attributeList);

  return formatProduct(product, images, categories, attributes);
}

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<ProductCategory[]> {
  const results = await db
    .select()
    .from(categories)
    .orderBy(categories.name);

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
