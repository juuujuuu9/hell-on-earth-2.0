/**
 * Gravity Forms API Helper
 * 
 * Handles form submissions to Gravity Forms via REST API.
 * Uses WORDPRESS_API_URL to determine the WordPress base URL.
 */

const WORDPRESS_API_URL = import.meta.env.WORDPRESS_API_URL;

/**
 * Get WordPress base URL from GraphQL endpoint
 * Example: http://www.hellonearthmfg.com/graphql -> http://www.hellonearthmfg.com
 */
export function getWordPressBaseUrl(): string {
  if (!WORDPRESS_API_URL || WORDPRESS_API_URL.trim() === '') {
    throw new Error('WORDPRESS_API_URL environment variable is required');
  }

  try {
    const url = new URL(WORDPRESS_API_URL);
    return `${url.protocol}//${url.host}`;
  } catch (error) {
    throw new Error(`Invalid WORDPRESS_API_URL: ${WORDPRESS_API_URL}`);
  }
}

export interface GravityFormSubmission {
  formId: number;
  fieldValues: Record<string, string | number>;
  targetPage?: number;
  sourcePage?: number;
}

export interface GravityFormResponse {
  is_valid: boolean;
  page_number?: number;
  confirmation_message?: string;
  validation_messages?: Record<string, string>;
  entry_id?: number;
}
