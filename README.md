## 🛠️ Environment Variables

Create a `.env` file in the root of the project and add the following variables:

```env
# .env.example

# 🛢️ PostgreSQL Database URL (NeonDB or similar)
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_HOST/YOUR_DB_NAME?sslmode=require

# 🔐 Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY=sk_test_YOUR_CLERK_SECRET_KEY

# 🤖 OpenAI API Key
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY

# 🌐 Base URL for Next.js App
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Or your deployed Vercel URL
```



## 🚀 Getting Started

```bash
npm i && npm run dev
```

Visit the app in your browser at:

```bash
http://localhost:3000/interview
```
