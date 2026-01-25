# Headless WooCommerce with Astro

A headless e-commerce setup using WordPress/WooCommerce as the backend and Astro for the frontend.

## 🚀 Tech Stack

- **Frontend**: Astro (Static Site Generation)
- **Backend**: WordPress/WooCommerce
- **Data Source**: WPGraphQL + WooGraphQL
- **Interactions**: React (for Cart/Checkout islands)
- **Styling**: Tailwind CSS

## 📋 Prerequisites

1. A WordPress site with WooCommerce installed
2. [WPGraphQL](https://www.wpgraphql.com/) plugin installed
3. [WooGraphQL](https://woographql.com/) extension installed

## 🛠️ Setup

1. **Install dependencies**:
   ```sh
   npm install
   ```

2. **Configure environment variables**:
   ```sh
   cp .env.example .env
   ```
   
   Edit `.env` and add your WordPress GraphQL endpoint:
   ```env
   WORDPRESS_API_URL=https://your-wordpress-site.com/graphql
   ```

3. **Start development server**:
   ```sh
   npm run dev
   ```

4. **Build for production**:
   ```sh
   npm run build
   ```

## 📁 Project Structure

```
/
├── public/              # Static assets
├── src/
│   ├── components/     # React/Astro components
│   ├── layouts/        # Page layouts
│   ├── lib/            # Core utilities
│   │   ├── wpgraphql.ts    # GraphQL client
│   │   ├── queries.ts      # GraphQL queries
│   │   └── types.ts        # TypeScript types
│   ├── pages/          # Astro pages/routes
│   │   ├── products/       # Product pages
│   │   └── index.astro     # Home page
│   └── styles/         # Global styles
└── package.json
```

## 🎯 Key Features

- **Static Site Generation**: All product pages are pre-rendered at build time
- **Type Safety**: Full TypeScript support with strict mode
- **GraphQL Client**: Centralized API client in `src/lib/wpgraphql.ts`
- **Product Pages**: Dynamic routes with `getStaticPaths` for all products
- **Price Formatting**: Automatic HTML tag stripping from WooCommerce prices

## 📝 Usage

### Fetching Products

```typescript
import { graphqlRequest } from '@lib/wpgraphql';
import { PRODUCTS_QUERY, type GetProductsResponse } from '@lib/queries';

const data = await graphqlRequest<GetProductsResponse>({
  query: PRODUCTS_QUERY,
  variables: { first: 10 },
});

const products = data.products.nodes;
```

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

## 🔧 Configuration

- **GraphQL Endpoint**: Set `WORDPRESS_API_URL` in `.env`
- **Path Aliases**: Configured in `astro.config.mjs` and `tsconfig.json`
  - `@/` → `src/`
  - `@components/` → `src/components/`
  - `@lib/` → `src/lib/`
  - `@layouts/` → `src/layouts/`

## 📚 Learn More

- [Astro Documentation](https://docs.astro.build)
- [WPGraphQL Documentation](https://www.wpgraphql.com/docs/)
- [WooGraphQL Documentation](https://woographql.com/docs/)
# hell-on-earth-2.0
