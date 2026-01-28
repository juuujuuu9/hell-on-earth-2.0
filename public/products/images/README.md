# Product Images Folder

Place your product images here. The script will upload them to Bunny.net CDN.

## Quick Start

1. **Add images** → Place PNG/JPG files here
2. **Compress** → Run `npm run compress:images` to optimize PNGs
3. **Convert to WebP** → Run `npm run compress:webp` for best compression
4. **Upload** → Run `npm run upload:products` (automatically prefers WebP files)

## Usage

### 1. Add Your Images
Place product image files in this folder (`public/products/images/`).

Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`

**Naming convention:**
- Use descriptive filenames (e.g., `Cool T-Shirt.jpg`, `Vintage Hoodie.png`)
- The script will convert filenames to product slugs automatically
- Example: `Cool T-Shirt.jpg` → slug: `cool-t-shirt`, name: `Cool T-Shirt`

### 1.5. Image Optimization Workflow (Recommended)

**Step 1: Compress PNGs/JPGs**
```bash
npm run compress:images -- --dir=public/products/images/MMXXVI-I
```

This compresses PNGs in place (typically 70-90% size reduction).

**Step 2: Convert to WebP**
```bash
npm run compress:webp -- --dir=public/products/images/MMXXVI-I
```

This creates `.webp` files alongside PNGs (typically 50-80% additional reduction).

**Why this workflow?**
- WebP provides the best compression (smallest file sizes)
- Modern browsers support WebP
- Upload script automatically prefers WebP over PNG
- You can keep PNGs as fallback or delete them after verifying WebP works

**Results:** Your 256MB folder → 23MB (compressed) → 6.6MB (WebP) = **97.4% total reduction!**

### 2. Upload Images Only
Uploads images to Bunny.net but doesn't create products:

```bash
npm run upload:images
```

This will:
- Upload all images from this folder to Bunny.net CDN
- Display CDN URLs for each image
- You can then manually add products via `npm run db:studio`

### 3. Upload Images + Create Products
Uploads images AND automatically creates products in the database:

```bash
npm run upload:products
```

This will:
- Upload all images to Bunny.net CDN
- Create products in the database with:
  - Name: derived from filename
  - Slug: derived from filename
  - Stock status: `IN_STOCK`
  - Primary image: linked to uploaded CDN URL
- You'll still need to add:
  - Prices
  - Descriptions
  - Categories
  - Stripe checkout URLs (when Stripe is ready)

### 4. Complete Product Setup
After uploading, use Drizzle Studio to complete product setup:

```bash
npm run db:studio
```

In Drizzle Studio, you can:
- Add prices, descriptions, and short descriptions
- Assign categories
- Add Stripe checkout URLs
- Add additional images to the gallery
- Set stock quantities

## Example Workflow

1. **Add images**: Place `Cool T-Shirt.png` in this folder
2. **Compress**: Run `npm run compress:images -- --dir=public/products/images/MMXXVI-I`
3. **Convert to WebP**: Run `npm run compress:webp -- --dir=public/products/images/MMXXVI-I`
4. **Upload**: Run `npm run upload:products` (automatically uses WebP files)
5. **Complete setup**: Run `npm run db:studio` and:
   - Set price: `29.99`
   - Add description: `A cool t-shirt...`
   - Assign category: `T-Shirts`
   - Add Stripe URL: `https://buy.stripe.com/...`

## Notes

- **WebP Priority**: Upload script automatically prefers WebP files over PNG files
- Images are uploaded to Bunny.net CDN path: `products/images/[filename]`
- Product slugs are auto-generated from filenames (lowercase, hyphenated)
- If a product with the same slug already exists, the script will link the image to the existing product
- Original PNG files remain in this folder after upload (you can delete them after verifying WebP works)
- WebP files are typically 70-90% smaller than original PNGs
