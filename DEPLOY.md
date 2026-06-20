# 部署指南（团队版 / Next.js + Postgres）

AI TestHub 团队版以 Docker 容器方式部署。镜像基于 `next build` 的 `standalone` 产物，Prisma 已配置 Alpine（`linux-musl-openssl-3.0.x`）引擎。

## 1. 准备环境变量

复制模板并填写：

```bash
cp .env.example .env
```

**生产必填**（其余按需）：

| 变量 | 说明 | 生成方式 |
|------|------|----------|
| `DATABASE_URL` | Postgres 连接串。compose 内部走服务名 `db` | 见 .env.example |
| `NEXTAUTH_SECRET` | 会话签名密钥，**必须设** | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | 站点对外 URL | 如 `https://testhub.example.com` |
| `WEBHOOK_SECRET` | junit/github webhook 鉴权，**不设则 webhook 全部 503** | `openssl rand -hex 32` |
| `OPENAI_API_KEY` 等 | AI provider 服务端 Key（也可在项目设置里按项目覆盖） | 各厂商控制台 |
| `AGENT_SANDBOX_ENABLED` | 是否在服务器真实执行 AI 生成脚本。**生产保持 `false`** | — |

> ⚠️ 安全：生产务必改掉 compose 里的默认库密码 `testhub/testhub`，并设置强 `NEXTAUTH_SECRET`、`WEBHOOK_SECRET`。

## 2. 一键起全栈（DB + 应用）

```bash
docker compose --profile app up -d --build
```

- `db`：PostgreSQL（pgvector:pg16），数据持久化到 `testhub-pgdata` 卷
- `app`：Next 应用，监听 `:3000`，附件持久化到 `testhub-uploads` 卷，自带 `/api/health` 探活

只起数据库（本地用 `npm run next:dev` 开发时）：

```bash
docker compose up -d db
```

## 3. 跑数据库迁移

首次部署或每次发版后，在 **app 容器内**用 `migrate deploy`（生产专用，不会改 schema、不交互）：

```bash
docker compose exec app npx prisma migrate deploy
```

> 不要在生产用 `prisma migrate dev`（那是开发命令，会尝试改 schema 并可能重置数据）。

## 4. 创建首个管理员

种子数据已清空。打开 `https://<你的域名>/register` 注册第一个用户，登录后即可创建项目。
（如需脚本化建账号，可在 app 容器内用 `node` + bcryptjs 写一条 User 记录。）

### 教学场景：老师建大项目、学生加入、看学生作业

数据按「项目成员」隔离——你只能看到自己是成员的项目。让全班在一个项目里协作、你（老师）看得到所有人的需求/用例/缺陷：

1. **老师注册并登录** → 新建一个项目，例如「软件测试实训」（创建者自动成为该项目 ADMIN）。
2. **学生各自注册**：让每个学生打开 `/register` 注册账号（记下他们的邮箱）。
3. **老师添加成员**：进入 **项目设置 → 团队成员**，输入学生邮箱，选角色（默认 **QA**，适合测试实训），点「添加成员」。逐个加入全班。
   - 角色含义：ADMIN（管项目/成员）、PM（管需求计划）、QA（建改需求/用例/缺陷/计划）、DEV（偏开发）、VIEWER（只读）。
   - 学生默认 QA 即可建/改需求、用例、缺陷、测试计划——正是实训要练的。
4. **学生登录**后即在项目里，所建内容都落在该项目、自动带本人作者名。
5. **老师查看**：作为 ADMIN 在各页面看到全班所有需求/用例/缺陷；**审计日志**（左侧若有入口或 `/api/projects/<id>/audit-logs`）记录「谁在什么时间改了什么」，方便批改与追踪。
6. 学生做完/退课，老师可在「团队成员」里改其角色为 VIEWER 或移出项目。

## 5. 验证

```bash
# 健康检查（DB 连通时返回 {"status":"ok","db":"up"}）
curl http://localhost:3000/api/health

# 应用首页（未登录会 307 跳 /login）
curl -I http://localhost:3000/
```

## 6. 升级发版

```bash
git pull
docker compose --profile app up -d --build      # 重建镜像
docker compose exec app npx prisma migrate deploy  # 应用新迁移
```

---

## 部署注意事项

- **附件存储**：当前为本地磁盘（`/app/public/uploads`），已挂持久卷。**多副本/水平扩展**时本地盘不共享，需改为对象存储（S3/MinIO）——见 `app/api/projects/[projectId]/attachments/route.ts` 的落盘逻辑。
- **反向代理**：生产建议在前面挂 Nginx/Caddy 终止 TLS，把 `NEXTAUTH_URL` 设为 https 域名。
- **数据库备份**：定期 `pg_dump`；`testhub-pgdata` 卷不要随手删。
- **Webhook 配置**：GitHub 在仓库 Webhook 设置里填 `WEBHOOK_SECRET`（用 `x-hub-signature-256`）；CI 调 junit webhook 时带 `?secret=<WEBHOOK_SECRET>`。
