import { defineConfig } from "drizzle-kit";

// 改成 TS 配置是为了从环境变量取连接串，避免把本地地址写进仓库。
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
