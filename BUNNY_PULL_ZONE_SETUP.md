# Bunny.net Pull Zone Setup (Required for Public Images)

Your Bunny.net storage zone is working, but you need to set up a **Pull Zone** (CDN) to serve images publicly.

## Quick Setup

### 1. Create Pull Zone

1. Go to [Bunny.net Dashboard](https://bunny.net)
2. Navigate to **CDN** → **Pull Zones**
3. Click **Add Pull Zone**
4. Fill in:
   - **Name**: `hell-on-earth-images` (or any name you prefer)
   - **Origin URL**: Leave empty (we're using Storage Zone)
   - **Storage Zone**: Select `hell-on-earth-2-0`
   - **Cache Expiration**: `30 days` (or your preference)
5. Click **Add Pull Zone**

### 2. Get Your CDN URL

After creating the Pull Zone:

1. Click on your Pull Zone
2. You'll see the **Hostname** - it looks like: `hell-on-earth-images.b-cdn.net`
3. Copy this URL

### 3. Update Environment Variables

Update your `.env.local` file:

```env
BUNNY_CDN_URL=https://hell-on-earth-images.b-cdn.net
```

Replace `hell-on-earth-images` with your actual Pull Zone hostname.

### 4. Verify Setup

Test that images are accessible:

```bash
# Test a direct image URL (replace with your actual image)
curl -I "https://your-pull-zone.b-cdn.net/products/images/Hunting%20Logo%20Hoodie.webp"
```

You should get `HTTP/2 200` instead of `403` or `suspended`.

## Alternative: Use Storage Zone Direct Access (Not Recommended)

If you don't want to set up a Pull Zone, you can make your storage zone public:

1. Go to **Storage** → **Storage Zones** → `hell-on-earth-2-0`
2. Click **Settings**
3. Enable **Public Access** (if available)
4. Note the public URL format

However, **Pull Zones are recommended** because they provide:
- Better performance (CDN caching)
- Lower bandwidth costs
- Better security
- More control

## Troubleshooting

### "Domain suspended or not configured"

This means your Pull Zone isn't set up or the CDN URL is incorrect.

**Solution**: Follow the steps above to create a Pull Zone and update `BUNNY_CDN_URL`.

### Images still not loading after Pull Zone setup

1. Verify Pull Zone is active (not paused)
2. Check that Storage Zone is linked to Pull Zone
3. Wait a few minutes for DNS propagation
4. Clear browser cache
5. Test with a direct URL first

### Need to update existing image URLs in database

If you've already uploaded images with the old URL format, you can:

1. Update URLs in database via Drizzle Studio: `npm run db:studio`
2. Or re-upload images (they'll get the new URL format automatically)

## Cost

- **Pull Zone**: Free (included with storage)
- **Bandwidth**: $0.01/GB (very affordable)
- **Storage**: $0.01/GB/month (minimum $1/month)

Your current setup should cost around **$1-2/month** for typical e-commerce traffic.
