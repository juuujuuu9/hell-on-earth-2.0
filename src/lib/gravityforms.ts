/**
 * Gravity Forms API Helper
 * 
 * Handles form submissions to Gravity Forms via REST API.
 */

/**
 * Get base URL for API requests
 * TODO: Replace with your new API base URL configuration
 */
export function getApiBaseUrl(): string {
  // TODO: Replace with your new API base URL
  const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || '';
  
  if (!API_BASE_URL || API_BASE_URL.trim() === '') {
    throw new Error('API_BASE_URL environment variable is required');
  }

  try {
    const url = new URL(API_BASE_URL);
    return `${url.protocol}//${url.host}`;
  } catch (error) {
    throw new Error(`Invalid API_BASE_URL: ${API_BASE_URL}`);
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
