# South Rally

South Rally is a Next.js pickleball management application.

## Getting Started

First, run the development server:

```bash
npm run dev
```

The development command intentionally uses Webpack. Turbopack on this project
can enter a runaway compilation state that consumes multiple CPU cores and
prevents the first page from loading.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database configuration

South Rally must use its own Supabase project. Copy the connection strings from
the South Rally project's **Connect** panel into `.env`:

```dotenv
DATABASE_URL="postgresql://<pooler-user>:<password>@<pooler-host>:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://<direct-user>:<password>@<direct-host>:5432/postgres"
```

`DATABASE_URL` is the pooled runtime connection and `DIRECT_URL` is the direct
connection Prisma uses for migrations. Supabase connection URLs commonly keep
the PostgreSQL database segment named `postgres`; the Supabase project itself
should be named **south-rally**. Never commit `.env`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deployment
This project is configured with a GitHub Actions CI/CD pipeline which deploys automatically to an Azure VM.
