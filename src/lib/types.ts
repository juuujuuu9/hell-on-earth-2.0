/**
 * TypeScript types for WooCommerce/WPGraphQL data
 */

export interface Product {
  id: string;
  databaseId: number;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price?: string;
  regularPrice?: string;
  salePrice?: string;
  onSale?: boolean;
  stockStatus?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_BACKORDER';
  stockQuantity?: number;
  image?: {
    sourceUrl: string;
    altText?: string;
  };
  galleryImages?: {
    nodes: Array<{
      sourceUrl: string;
      altText?: string;
    }>;
  };
  productCategories?: {
    nodes: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
  };
  attributes?: {
    nodes: Array<{
      id: string;
      name: string;
      options: string[];
    }>;
  };
}

export interface ProductCategory {
  id: string;
  databaseId: number;
  name: string;
  slug: string;
  description?: string;
  image?: {
    sourceUrl: string;
    altText?: string;
  };
}

export interface CartItem {
  key: string;
  product: {
    node: Product;
  };
  quantity: number;
  subtotal?: string;
  total?: string;
}

export interface Cart {
  contents?: {
    nodes: CartItem[];
  };
  total?: string;
  subtotal?: string;
  itemCount?: number;
}
