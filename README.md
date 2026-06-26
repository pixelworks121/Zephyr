# Zephyr

AI-powered lead generation and CRM platform for **Pixel Works**.

## Packages

| Package     | Description                                  |
| ----------- | -------------------------------------------- |
| `client`    | React 18 + Vite + Tailwind + shadcn/ui       |
| `server`    | Node.js + Express + Prisma + PostgreSQL      |
| `ai-engine` | Claude + OpenAI multi-agent logic            |
| `scraper`   | Playwright + Google APIs + Hunter + Apollo    |
| `shared`    | Types, constants, and utilities              |

## Getting Started

```bash
npm install
cp .env.example .env       # fill in your keys
npm run dev                # starts all packages
```

Individual packages:

```bash
npm run dev:client
npm run dev:server
```

## Database

```bash
npx prisma db push -w server
npx prisma studio -w server
```

frontend - vercel
backend - render
