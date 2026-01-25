/**
 * Gravity Forms Submission API Route
 * 
 * Proxies form submissions to Gravity Forms REST API.
 * This handles CORS and keeps API credentials server-side.
 */

import type { APIRoute } from 'astro';
import {
  getWordPressBaseUrl,
  type GravityFormSubmission,
  type GravityFormResponse,
} from '@lib/gravityforms';

const GRAVITY_FORMS_API_KEY = import.meta.env.GRAVITY_FORMS_API_KEY;
const GRAVITY_FORMS_API_SECRET = import.meta.env.GRAVITY_FORMS_API_SECRET;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.formId || typeof body.formId !== 'number') {
      return new Response(
        JSON.stringify({ error: 'formId is required and must be a number' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!body.fieldValues || typeof body.fieldValues !== 'object') {
      return new Response(
        JSON.stringify({
          error: 'fieldValues is required and must be an object',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const baseUrl = getWordPressBaseUrl();
    const endpoint = `${baseUrl}/wp-json/gf/v2/forms/${body.formId}/submissions`;

    const requestBody: Record<string, unknown> = {
      ...body.fieldValues,
    };

    if (body.targetPage !== undefined) {
      requestBody.target_page = body.targetPage;
    }
    if (body.sourcePage !== undefined) {
      requestBody.source_page = body.sourcePage;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add Basic Auth if API keys are provided
    if (GRAVITY_FORMS_API_KEY && GRAVITY_FORMS_API_SECRET) {
      const auth = Buffer.from(
        `${GRAVITY_FORMS_API_KEY}:${GRAVITY_FORMS_API_SECRET}`
      ).toString('base64');
      headers.Authorization = `Basic ${auth}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          error: `Gravity Forms API request failed: ${response.status} ${response.statusText}`,
          details: errorText,
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result: GravityFormResponse = await response.json();

    return new Response(JSON.stringify(result), {
      status: result.is_valid ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error submitting Gravity Form:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
