# Bunny.net Regional Endpoints

Bunny.net Storage API uses different endpoints based on your storage zone's region:

- **Frankfurt, DE**: `storage.bunnycdn.com` (default)
- **London, UK**: `uk.storage.bunnycdn.com`
- **New York, US**: `ny.storage.bunnycdn.com`
- **Los Angeles, US**: `la.storage.bunnycdn.com`
- **Singapore**: `sg.storage.bunnycdn.com`
- **Sydney, AU**: `syd.storage.bunnycdn.com`

## How to Find Your Region

1. Go to Bunny.net Dashboard → Storage → Storage Zones
2. Click on your storage zone
3. Check the **FTP & HTTP API** section
4. Look for the **HTTP API URL** - it will show the correct regional endpoint

Example URLs you might see:
- `https://storage.bunnycdn.com/hell-on-earth-2-0/` (Frankfurt)
- `https://uk.storage.bunnycdn.com/hell-on-earth-2-0/` (London)
- `https://ny.storage.bunnycdn.com/hell-on-earth-2-0/` (New York)

## Update Your Configuration

Once you know your region, you can either:
1. Use the default endpoint (works for most regions)
2. Or specify the regional endpoint in your code

The current code uses `storage.bunnycdn.com` which should work for Frankfurt and most regions, but if your zone is in a specific region, you might need to use the regional endpoint.
