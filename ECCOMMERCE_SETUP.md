# E-commerce Setup Guide

This project is configured to use:
- **Database**: Neon DB (PostgreSQL) - Free tier
- **Images**: Bunny.net CDN - $1.00/mo minimum
- **Hosting**: Vercel - Free tier
- **Payment**: Stripe Checkout Links - No backend logic needed

## Quick Start

### 1. Set Up Neon DB

1. Go to [Neon Console](https://console.neon.tech) and create a new project
2. Copy your connection string (it looks like: `postgresql://user:password@host/database?sslmode=require`)
3. Add it to your `.env.local` file:

```bash
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

### 2. Run Database Migrations

```bash
# Generate migration files from schema
npm run db:generate

# Push schema to database (for development)
npm run db:push

# Or use migrations (for production)
npm run db:migrate
```

### 3. Set Up Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Get your API keys (use test keys for development)
3. Add to `.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Set Up Bunny.net (Optional - for image uploads)

1. Sign up at [Bunny.net](https://bunny.net)
2. Create a storage zone
3. Get your API key and CDN URL
4. Add to `.env.local`:

```bash
BUNNY_API_KEY=your-api-key
BUNNY_STORAGE_ZONE=your-storage-zone-name
BUNNY_CDN_URL=https://your-storage-zone.b-cdn.net
```

## Adding Products

### Using Drizzle Studio (Recommended)

```bash
npm run db:studio
```

This opens a visual database editor where you can:
- Add products
- Add categories
- Upload images (manually add Bunny.net URLs)
- Link products to categories
- Add Stripe checkout URLs

### Using SQL Directly

Connect to your Neon database and insert products:

```sql
-- Add a category
INSERT INTO categories (id, name, slug) 
VALUES ('cat-1', 'T-Shirts', 't-shirts');

-- Add a product
INSERT INTO products (id, name, slug, price, stock_status, stripe_checkout_url)
VALUES ('prod-1', 'Cool T-Shirt', 'cool-t-shirt', 29.99, 'IN_STOCK', 'https://buy.stripe.com/...');

-- Link product to category
INSERT INTO product_categories (id, product_id, category_id)
VALUES ('pc-1', 'prod-1', 'cat-1');

-- Add product image
INSERT INTO product_images (id, product_id, image_url, alt_text, is_primary)
VALUES ('img-1', 'prod-1', 'https://your-storage-zone.b-cdn.net/image.jpg', 'Cool T-Shirt', true);
```

## Creating Stripe Checkout Links

### Option 1: Stripe Dashboard (Easiest)

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Create a product and price
3. Create a Payment Link
4. Copy the Payment Link URL
5. Add it to your product's `stripe_checkout_url` field in the database

### Option 2: Using the Stripe API

Use the utility functions in `src/lib/stripe.ts`:

```typescript
import { createPaymentLink } from '@lib/stripe';

const checkoutUrl = await createPaymentLink({
  priceId: 'price_1234567890',
  productName: 'Cool T-Shirt',
});

// Then save this URL to your product in the database
```

## Image Management

### Uploading to Bunny.net

Use the utility function in `src/lib/bunny.ts`:

```typescript
import { uploadImageToBunny } from '@lib/bunny';

const imageUrl = await uploadImageToBunny(
  fileBuffer, // Buffer or file path
  'products/cool-t-shirt.jpg'
);

// Save imageUrl to product_images table
```

### Manual Upload

1. Upload images to Bunny.net storage zone via their dashboard
2. Copy the CDN URL
3. Add to `product_images` table with the CDN URL

## Database Schema

- **products**: Main product data
- **categories**: Product categories
- **product_images**: Product gallery images (linked to Bunny.net CDN)
- **product_categories**: Many-to-many relationship between products and categories
- **product_attributes**: Product variants (size, color, etc.)

See `src/lib/db/schema.ts` for full schema definition.

## Development Workflow

1. **Make schema changes**: Edit `src/lib/db/schema.ts`
2. **Generate migration**: `npm run db:generate`
3. **Apply migration**: `npm run db:push` (dev) or `npm run db:migrate` (prod)
4. **View data**: `npm run db:studio`

## Production Deployment

1. Set environment variables in Vercel dashboard
2. Run migrations before first deploy (or use Vercel's build command)
3. Products are fetched at build time (SSG) for optimal performance

## Troubleshooting

### Database Connection Errors

- Check that `DATABASE_URL` is set correctly in `.env.local`
- Ensure your Neon project is active
- Verify SSL mode is included in connection string

### Stripe Checkout Not Working

- Verify `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` are set
- Check that product has a `stripe_checkout_url` in database
- Ensure Stripe keys match your environment (test vs live)

### Images Not Loading

- Verify Bunny.net credentials are set
- Check that image URLs in database are valid CDN URLs
- Ensure storage zone is public or has proper CORS settings

## Cost Breakdown

- **Neon DB**: Free tier (512 MB storage, 1 project)
- **Bunny.net**: $1.00/month minimum (10 GB storage)
- **Vercel**: Free tier (100 GB bandwidth)
- **Stripe**: 2.9% + $0.30 per transaction (no monthly fee)

Total: ~$1/month + transaction fees
