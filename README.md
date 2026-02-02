# Headless E-commerce with Astro

A headless e-commerce setup using Astro for the frontend.

## 🚀 Tech Stack

- **Frontend**: Astro (Static Site Generation)
- **Database**: Neon DB (PostgreSQL) - Free tier
- **Images**: Bunny.net CDN - $1.00/mo
- **Hosting**: Vercel - Free tier
- **Payment**: Stripe Checkout Links - No backend logic
- **Interactions**: React (for Cart/Checkout islands)
- **Styling**: Tailwind CSS

## 🛠️ Setup

1. **Install dependencies**:
   ```sh
   npm install
   ```

2. **Configure environment variables**:
   ```sh
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   ```env
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   BUNNY_API_KEY=your-api-key
   BUNNY_STORAGE_ZONE=your-storage-zone
   BUNNY_CDN_URL=https://your-storage-zone.b-cdn.net
   ```

3. **Set up database**:
   ```sh
   npm run db:generate  # Generate migration files
   npm run db:push      # Push schema to database
   npm run db:studio    # Open visual database editor
   ```

4. **Start development server**:
   ```sh
   npm run dev
   ```

5. **Build for production**:
   ```sh
   npm run build
   ```

6. **Vercel deployment**: In your Vercel project settings, set **Build Command** to `npm run build:vercel` so production uses the locked config (`astro.config.vercel.mjs`). Local dev and `npm run build` use `astro.config.mjs`.

📖 **For detailed setup instructions, see [ECCOMMERCE_SETUP.md](./ECCOMMERCE_SETUP.md)**

## 📁 Project Structure

```
/
├── public/              # Static assets
├── src/
│   ├── components/     # React/Astro components
│   ├── layouts/        # Page layouts
│   ├── lib/            # Core utilities
│   │   ├── db/             # Database (Drizzle ORM)
│   │   │   ├── schema.ts      # Database schema
│   │   │   ├── queries.ts     # Query utilities
│   │   │   └── index.ts       # Database connection
│   │   ├── stripe.ts        # Stripe integration
│   │   ├── bunny.ts         # Bunny.net CDN integration
│   │   └── types.ts         # TypeScript types
│   ├── pages/          # Astro pages/routes
│   │   ├── api/            # API routes
│   │   ├── products/       # Product pages
│   │   └── index.astro     # Home page
│   └── styles/         # Global styles
├── drizzle/            # Generated migration files
├── drizzle.config.ts   # Drizzle configuration
└── package.json
```

## 🎯 Key Features

- **Static Site Generation**: All product pages are pre-rendered at build time
- **Type Safety**: Full TypeScript support with strict mode
- **Product Pages**: Dynamic routes with `getStaticPaths` for all products

## 📝 Usage

### Creating Product Pages

Every product page must include a `getStaticPaths` function:

```typescript
export async function getStaticPaths() {
  // Fetch all product slugs and return paths
}
```

See `src/pages/products/[slug].astro` for a complete example.

## 🧞 Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run db:generate`     | Generate database migration files                |
| `npm run db:push`         | Push schema changes to database (dev)            |
| `npm run db:migrate`      | Run database migrations (production)            |
| `npm run db:studio`       | Open Drizzle Studio (visual database editor)     |

## 🔧 Configuration

- **API Base URL**: Set `PUBLIC_API_BASE_URL` in `.env`
- **Path Aliases**: Configured in `astro.config.mjs` and `tsconfig.json`
  - `@/` → `src/`
  - `@components/` → `src/components/`
  - `@lib/` → `src/lib/`
  - `@layouts/` → `src/layouts/`

## 📚 Learn More

- [Astro Documentation](https://docs.astro.build)
# hell-on-earth-2.0
