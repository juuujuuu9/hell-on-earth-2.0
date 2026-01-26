/**
 * WPGraphQL + WooGraphQL Client
 * 
 * Handles all GraphQL requests to WordPress/WooCommerce backend.
 * Uses WORDPRESS_API_URL environment variable for endpoint.
 */

import { PRODUCTS_QUERY, type GetProductsResponse } from './queries';
import type { Product } from './types';

// Support both server-side (WORDPRESS_API_URL) and client-side (PUBLIC_WORDPRESS_API_URL)
const WORDPRESS_API_URL = import.meta.env.PUBLIC_WORDPRESS_API_URL || import.meta.env.WORDPRESS_API_URL;

if (!WORDPRESS_API_URL || WORDPRESS_API_URL.trim() === '') {
  throw new Error(
    'WORDPRESS_API_URL or PUBLIC_WORDPRESS_API_URL environment variable is required. ' +
    'For client-side components, use PUBLIC_WORDPRESS_API_URL in your .env file: PUBLIC_WORDPRESS_API_URL=https://your-site.com/graphql'
  );
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
  }>;
}

export interface GraphQLRequestOptions {
  query: string;
  variables?: Record<string, unknown>;
}

/**
 * Execute a GraphQL query against the WordPress API
 */
export async function graphqlRequest<T>(
  options: GraphQLRequestOptions
): Promise<T> {
  if (!options.query || options.query.trim() === '') {
    throw new Error('GraphQL query is required and cannot be empty');
  }


  const requestBody = {
    query: options.query.trim(),
    variables: options.variables || {},
  };

  const response = await fetch(WORDPRESS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    const errorMessages = result.errors.map((e) => e.message).join(', ');
    throw new Error(`GraphQL errors: ${errorMessages}`);
  }

  if (!result.data) {
    throw new Error('GraphQL response missing data');
  }

  return result.data;
}

/**
 * Strip HTML tags from WooCommerce price strings
 * WooCommerce often returns prices with HTML formatting
 */
export function stripPriceHtml(price: string): string {
  return price.replace(/<[^>]*>/g, '').trim();
}

/**
 * Fetch WooCommerce products
 */
export async function getWooData(): Promise<Product[]> {
  // Ensure query is defined and not empty
  if (!PRODUCTS_QUERY || PRODUCTS_QUERY.trim() === '') {
    throw new Error('PRODUCTS_QUERY is not defined or empty');
  }

  const data = await graphqlRequest<GetProductsResponse>({
    query: PRODUCTS_QUERY,
    variables: {
      first: 100,
    },
  });
  return data.products.nodes;
}
