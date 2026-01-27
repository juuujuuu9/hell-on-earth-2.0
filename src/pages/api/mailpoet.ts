/**
 * MailPoet Subscription API Route
 * 
 * Proxies MailPoet form submissions to prevent CORS issues
 * and keep users on the current site (no redirects).
 */

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type') || '';
    let params: URLSearchParams;
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Read body as text and parse URLSearchParams directly
      const bodyText = await request.text();
      params = new URLSearchParams(bodyText);
    } else if (contentType.includes('multipart/form-data')) {
      // Parse as FormData and convert to URLSearchParams
      const formData = await request.formData();
      params = new URLSearchParams();
      for (const [key, value] of formData.entries()) {
        params.append(key, value.toString());
      }
    } else {
      // Try to read as text and parse
      try {
        const bodyText = await request.text();
        params = new URLSearchParams(bodyText);
      } catch (e) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid Content-Type. Expected multipart/form-data or application/x-www-form-urlencoded.',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }
    
    // Forward the form data to MailPoet
    const mailpoetUrl = 'https://hellonearthmfg.com/wp-admin/admin-post.php?action=mailpoet_subscription_form';
    
    const response = await fetch(mailpoetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      redirect: 'manual', // Prevent automatic redirect following
    });

    // MailPoet typically returns a 302 redirect on success
    // We'll treat 200, 302, or any non-error status as success
    const isSuccess = response.ok || response.status === 302 || response.status === 0;

    if (isSuccess) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Check your inbox or spam folder to confirm your subscription.',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle errors
    const responseText = await response.text();
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to submit subscription. Please try again.',
        details: responseText,
      }),
      {
        status: response.status || 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error submitting MailPoet form:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
