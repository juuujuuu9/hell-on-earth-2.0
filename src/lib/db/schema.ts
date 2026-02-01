/**
 * Database Schema for E-commerce
 * 
 * Using Drizzle ORM with Neon DB (PostgreSQL)
 */

import { pgTable, text, integer, decimal, boolean, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const stockStatusEnum = pgEnum('stock_status', ['IN_STOCK', 'OUT_OF_STOCK', 'ON_BACKORDER']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'settled', 'expired', 'invalid']);

// Categories table
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  imageUrl: text('image_url'),
  imageAlt: text('image_alt'),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Products table
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  shortDescription: text('short_description'),
  price: decimal('price', { precision: 10, scale: 2 }),
  regularPrice: decimal('regular_price', { precision: 10, scale: 2 }),
  salePrice: decimal('sale_price', { precision: 10, scale: 2 }),
  onSale: boolean('on_sale').default(false).notNull(),
  stockStatus: stockStatusEnum('stock_status').default('IN_STOCK').notNull(),
  stockQuantity: integer('stock_quantity'),
  measurements: text('measurements'), // Product measurements/sizing information
  materials: text('materials'), // Product materials information (rich text/HTML)
  features: text('features'), // Product features information (rich text/HTML)
  details: text('details'), // Product details information (rich text/HTML)
  stripeCheckoutUrl: text('stripe_checkout_url'), // Stripe Checkout link
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Product images table (for gallery images)
export const productImages = pgTable('product_images', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(), // Bunny.net CDN URL
  altText: text('alt_text'),
  isPrimary: boolean('is_primary').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Product categories junction table (many-to-many)
export const productCategories = pgTable('product_categories', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Product attributes table (for variants like size, color, etc.)
export const productAttributes = pgTable('product_attributes', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., "Size", "Color"
  options: text('options').notNull(), // JSON array of options: ["S", "M", "L"]
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// BTCPay orders: maps invoiceId to order for webhook processing
export const btcpayOrders = pgTable('btcpay_orders', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').default(1).notNull(),
  size: text('size'),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('USD').notNull(),
  status: orderStatusEnum('status').default('pending').notNull(),
  btcpayInvoiceId: text('btcpay_invoice_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Product size inventory: per-product size labels with updatable quantity (no measurements stored here)
export const productSizeInventory = pgTable(
  'product_size_inventory',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    size: text('size').notNull(), // e.g. "S", "M", "L", "28\"", "One Size"
    quantity: integer('quantity').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    productSizeUnique: unique().on(table.productId, table.size),
  })
);

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  productCategories: many(productCategories),
}));

export const productsRelations = relations(products, ({ many }) => ({
  images: many(productImages),
  productCategories: many(productCategories),
  attributes: many(productAttributes),
  sizeInventory: many(productSizeInventory),
  btcpayOrders: many(btcpayOrders),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const productAttributesRelations = relations(productAttributes, ({ one }) => ({
  product: one(products, {
    fields: [productAttributes.productId],
    references: [products.id],
  }),
}));

export const productSizeInventoryRelations = relations(productSizeInventory, ({ one }) => ({
  product: one(products, {
    fields: [productSizeInventory.productId],
    references: [products.id],
  }),
}));

export const btcpayOrdersRelations = relations(btcpayOrders, ({ one }) => ({
  product: one(products, {
    fields: [btcpayOrders.productId],
    references: [products.id],
  }),
}));

// Type exports for use in application code
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;
export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;
export type ProductAttribute = typeof productAttributes.$inferSelect;
export type NewProductAttribute = typeof productAttributes.$inferInsert;
export type ProductSizeInventory = typeof productSizeInventory.$inferSelect;
export type NewProductSizeInventory = typeof productSizeInventory.$inferInsert;
export type BtcpayOrder = typeof btcpayOrders.$inferSelect;
export type NewBtcpayOrder = typeof btcpayOrders.$inferInsert;
