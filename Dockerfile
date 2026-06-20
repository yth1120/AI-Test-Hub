# ===== AI TestHub 团队版（Next.js standalone）生产镜像 =====
# 多阶段构建：deps → builder → runner
# Alpine + Prisma musl 引擎（schema binaryTargets 已含 linux-musl-openssl-3.0.x）

# ---- 1. 依赖 ----
FROM node:20-alpine AS deps
# Prisma 引擎在 Alpine 需要 openssl
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- 2. 构建 ----
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 生成 Prisma client（含 musl 引擎）后再 next build
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run next:build

# ---- 3. 运行 ----
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# 非 root 用户运行
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# standalone 产物 + 静态资源（standalone 不自动拷贝 static/public）
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# 迁移脚本（容器内可执行 prisma migrate deploy）
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# 附件上传目录（建议挂载持久卷到 /app/public/uploads）
RUN mkdir -p ./public/uploads && chown -R nextjs:nodejs ./public/uploads

USER nextjs
EXPOSE 3000

# server.js 由 Next standalone 生成
CMD ["node", "server.js"]
