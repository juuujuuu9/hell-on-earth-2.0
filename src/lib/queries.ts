/**
 * GraphQL queries for WooCommerce products
 */

import type { Product, ProductCategory } from './types';

export const PRODUCT_FIELDS = `
  id
  databaseId
  name
  slug
  description
  shortDescription
  price
  regularPrice
  salePrice
  onSale
  stockStatus
  stockQuantity
  image {
    sourceUrl
    altText
  }
  galleryImages {
    nodes {
      sourceUrl
      altText
    }
  }
  categories {
    nodes {
      id
      name
      slug
    }
  }
  attributes {
    nodes {
      id
      name
      options
    }
  }
`;

export const PRODUCT_QUERY = `
  query GetProduct($id: ID!, $idType: ProductIdTypeEnum) {
    product(id: $id, idType: $idType) {
      ${PRODUCT_FIELDS}
    }
  }
`;

export const PRODUCTS_QUERY = `
  query GetProducts($first: Int, $after: String, $where: RootQueryToProductConnectionWhereArgs) {
    products(first: $first, after: $after, where: $where) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        ${PRODUCT_FIELDS}
      }
    }
  }
`;

export const PRODUCT_SLUGS_QUERY = `
  query GetProductSlugs($first: Int) {
    products(first: $first) {
      nodes {
        slug
        databaseId
      }
    }
  }
`;

export const CATEGORIES_QUERY = `
  query GetCategories($first: Int) {
    productCategories(first: $first) {
      nodes {
        id
        databaseId
        name
        slug
        description
        image {
          sourceUrl
          altText
        }
      }
    }
  }
`;

export interface GetProductVariables {
  id: string;
  idType?: 'DATABASE_ID' | 'ID' | 'SLUG' | 'SKU' | 'URI';
}

export interface GetProductResponse {
  product: Product | null;
}

export interface GetProductsVariables {
  first?: number;
  after?: string;
  where?: {
    category?: string;
    categoryId?: number;
    search?: string;
    stockStatus?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_BACKORDER';
  };
}

export interface GetProductsResponse {
  products: {
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
    nodes: Product[];
  };
}

export interface GetProductSlugsResponse {
  products: {
    nodes: Array<{
      slug: string;
      databaseId: number;
    }>;
  };
}

export interface GetCategoriesResponse {
  productCategories: {
    nodes: ProductCategory[];
  };
}
