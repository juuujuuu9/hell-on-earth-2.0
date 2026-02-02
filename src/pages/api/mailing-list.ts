/**
 * POST /api/mailing-list – subscribe email (from index or footer form).
 * Stores entries in mailing_list table. Duplicate email returns success (idempotent).
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '@lib/db';
import { mailingList } from '@lib/db/schema';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = ['index', 'footer'] as const;

async function parseBody(
  request: Request
): Promise<{ email: string; source?: string } | null> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await request.json().catch(() => null);
    return data && typeof data === 'object' && typeof (data as { email?: unknown }).email === 'string'
      ? { email: (data as { email: string }).email, source: (data as { source?: string }).source }
      : null;
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const email = (params.get('email') ?? params.get('data[email]') ?? '').trim();
    const source = params.get('source') ?? undefined;
    return { email, source };
  }
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const email = (formData.get('email') ?? formData.get('data[email]') ?? '').toString().trim();
    const source = (formData.get('source') ?? '').toString() || undefined;
    return { email, source };
  }
  const data = await request.json().catch(() => null);
  return data && typeof data === 'object' && typeof (data as { email?: unknown }).email === 'string'
    ? { email: (data as { email: string }).email, source: (data as { source?: string }).source }
    : null;
}

export const POST: APIRoute = async ({ request }) => {
  const body = await parseBody(request);
  if (!body?.email || typeof body.email !== 'string') {
    return new Response(
      JSON.stringify({ success: false, error: 'Email is required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const email = body.email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Please enter a valid email address.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const source =
    body.source && SOURCES.includes(body.source as (typeof SOURCES)[number])
      ? (body.source as (typeof SOURCES)[number])
      : undefined;

  try {
    const id = crypto.randomUUID();
    await db
      .insert(mailingList)
      .values({ id, email, source })
      .onConflictDoNothing({ target: mailingList.email });
  } catch (e) {
    console.error('Mailing list insert error:', e);
    return new Response(
      JSON.stringify({ success: false, error: 'Could not save subscription. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Thanks for subscribing. Check your inbox for updates.',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
