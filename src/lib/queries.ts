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

/**
 * Cart Queries and Mutations
 */
export const CART_QUERY = `
  query GetCart {
    cart {
      contents {
        nodes {
          key
          quantity
          subtotal
          total
          product {
            node {
              id
              databaseId
              name
              slug
              price
              image {
                sourceUrl
                altText
              }
            }
          }
        }
      }
      total
      subtotal
      itemCount
    }
  }
`;

export const ADD_TO_CART_MUTATION = `
  mutation AddToCart($productId: Int!, $quantity: Int) {
    addToCart(input: { productId: $productId, quantity: $quantity }) {
      cart {
        contents {
          nodes {
            key
            quantity
            subtotal
            total
            product {
              node {
                id
                databaseId
                name
                slug
                price
                image {
                  sourceUrl
                  altText
                }
              }
            }
          }
        }
        total
        subtotal
        itemCount
      }
      cartItem {
        key
        quantity
        product {
          node {
            id
            databaseId
            name
          }
        }
      }
    }
  }
`;

export const UPDATE_CART_ITEM_MUTATION = `
  mutation UpdateCartItem($key: ID!, $quantity: Int!) {
    updateItemQuantities(input: { items: [{ key: $key, quantity: $quantity }] }) {
      cart {
        contents {
          nodes {
            key
            quantity
            subtotal
            total
            product {
              node {
                id
                databaseId
                name
                slug
                price
                image {
                  sourceUrl
                  altText
                }
              }
            }
          }
        }
        total
        subtotal
        itemCount
      }
      updated {
        key
        quantity
      }
    }
  }
`;

export const REMOVE_CART_ITEM_MUTATION = `
  mutation RemoveCartItem($key: ID!) {
    removeItemsFromCart(input: { keys: [$key] }) {
      cart {
        contents {
          nodes {
            key
            quantity
            subtotal
            total
            product {
              node {
                id
                databaseId
                name
                slug
                price
                image {
                  sourceUrl
                  altText
                }
              }
            }
          }
        }
        total
        subtotal
        itemCount
      }
    }
  }
`;

export interface AddToCartVariables {
  productId: number;
  quantity?: number;
}

export interface AddToCartResponse {
  addToCart: {
    cart: {
      contents: {
        nodes: Array<{
          key: string;
          quantity: number;
          subtotal: string;
          total: string;
          product: {
            node: {
              id: string;
              databaseId: number;
              name: string;
              slug: string;
              price: string;
              image?: {
                sourceUrl: string;
                altText?: string;
              };
            };
          };
        }>;
      };
      total: string;
      subtotal: string;
      itemCount: number;
    };
    cartItem: {
      key: string;
      quantity: number;
      product: {
        node: {
          id: string;
          databaseId: number;
          name: string;
        };
      };
    };
  };
}

export interface UpdateCartItemVariables {
  key: string;
  quantity: number;
}

export interface UpdateCartItemResponse {
  updateItemQuantities: {
    cart: {
      contents: {
        nodes: Array<{
          key: string;
          quantity: number;
          subtotal: string;
          total: string;
          product: {
            node: {
              id: string;
              databaseId: number;
              name: string;
              slug: string;
              price: string;
              image?: {
                sourceUrl: string;
                altText?: string;
              };
            };
          };
        }>;
      };
      total: string;
      subtotal: string;
      itemCount: number;
    };
    updated: Array<{
      key: string;
      quantity: number;
    }>;
  };
}

export interface RemoveCartItemVariables {
  key: string;
}

export interface RemoveCartItemResponse {
  removeItemsFromCart: {
    cart: {
      contents: {
        nodes: Array<{
          key: string;
          quantity: number;
          subtotal: string;
          total: string;
          product: {
            node: {
              id: string;
              databaseId: number;
              name: string;
              slug: string;
              price: string;
              image?: {
                sourceUrl: string;
                altText?: string;
              };
            };
          };
        }>;
      };
      total: string;
      subtotal: string;
      itemCount: number;
    };
  };
}

export interface GetCartResponse {
  cart: {
    contents: {
      nodes: Array<{
        key: string;
        quantity: number;
        subtotal: string;
        total: string;
        product: {
          node: {
            id: string;
            databaseId: number;
            name: string;
            slug: string;
            price: string;
            image?: {
              sourceUrl: string;
              altText?: string;
            };
          };
        };
      }>;
    };
    total: string;
    subtotal: string;
    itemCount: number;
  } | null;
}
