# AI TestHub

AI 驱动的软件测试需求管理工具 —— 支持团队协作、需求追溯、AI 辅助生成测试用例与脚本。

## 功能特性

| 模块 | 说明 |
|------|------|
| **项目管理** | 多项目管理，按成员隔离数据，5 种角色（ADMIN / PM / QA / DEV / VIEWER） |
| **需求管理** | 需求的增删改查，支持层级结构、状态流转、优先级 |
| **测试计划** | 组织测试范围、周期与策略，关联需求，驱动执行轮次 |
| **测试用例** | 用例管理，关联需求与测试点，支持分类、前置条件、步骤 |
| **缺陷跟踪** | 缺陷全生命周期（OPEN → IN_PROGRESS → RESOLVED → CLOSED），关联用例 |
| **执行轮次** | 按版本/计划批量执行用例，追踪每轮通过率 |
| **追溯矩阵** | 需求 → 测试点 → 用例 → 执行结果的完整追溯链 |
| **附件上传** | 需求/用例/缺陷支持文件附件（截图、文档等） |
| **AI Agent** | 四阶段 AI 流水线：需求分析 → 用例设计 → 脚本生成 → 自愈维护 |
| **通知系统** | 站内通知（指派、状态变更），全局搜索 |
| **测试报告** | 需求覆盖率、用例通过率、缺陷分布等统计与导出 |
| **团队协作** | 成员管理、审计日志、评论、Webhook 集成（GitHub / JUnit） |

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 前端 | React 18 + TypeScript + Tailwind CSS |
| 数据库 | PostgreSQL 16 (Prisma ORM) |
| 认证 | NextAuth.js (JWT + Credentials) |
| AI | Vercel AI SDK（支持 OpenAI / Anthropic / Google / DeepSeek / Kimi / 通义） |
| 代码编辑器 | Monaco Editor |
| 图标 | Ph Phosphor Icons |
| 容器化 | Docker + Docker Compose |

## 快速开始

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/yth1120/AI-Test-Hub.git
cd AI-Test-Hub

# 2. 安装依赖
npm install

# 3. 启动数据库
docker compose up -d db

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env，填写 DB_PASSWORD、NEXTAUTH_SECRET 等

# 5. 初始化数据库
npm run prisma:migrate
npm run prisma:generate

# 6. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

### Docker 部署（推荐生产环境）

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env，填写密钥等

# 2. 构建并启动
docker compose --profile app up -d --build

# 3. 初始化数据库
docker compose exec -T app sh -c "node node_modules/prisma/build/index.js migrate deploy"

# 4. 访问 http://localhost:3000，注册第一个账号（自动成为管理员）
```

> 详细部署指南见 [DEPLOY.md](DEPLOY.md)

## 项目结构

```
├── app/                    # Next.js App Router（页面 + API 路由）
│   ├── (dashboard)/        # 仪表盘页面（复用 src/renderer 组件）
│   └── api/                # REST API（需求/用例/缺陷/成员/AI 等）
├── components/             # 共享 UI 组件（侧边栏、全局搜索、通知等）
├── lib/                    # 工具库（Prisma 客户端、认证、API 客户端等）
├── src/
│   ├── main/               # AI 服务（ai-service / agent-orchestrator / agent-tools）
│   ├── renderer/           # React 页面、hooks、组件（团队版复用）
│   └── shared/             # 共享 TypeScript 类型定义
├── prisma/
│   ├── schema.prisma       # 数据库模型定义
│   └── migrations/         # 数据库迁移文件
├── types/                  # 全局类型声明
├── docker-compose.yml      # Docker 编排
├── Dockerfile              # 生产镜像构建
└── DEPLOY.md               # 部署指南
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DB_PASSWORD` | ✅ | PostgreSQL 数据库密码 |
| `NEXTAUTH_SECRET` | ✅ | 会话签名密钥（`openssl rand -base64 32` 生成） |
| `NEXTAUTH_URL` | ✅ | 站点 URL（如 `http://localhost:3000`） |
| `WEBHOOK_SECRET` | | Webhook 鉴权密钥 |
| `OPENAI_API_KEY` | | OpenAI API Key（也可在项目设置里按项目配置） |
| `DEEPSEEK_API_KEY` | | DeepSeek API Key |
| 其他 AI Key | | Anthropic / Google / Kimi / 通义 |

> AI Key 优先读项目设置里的值，未配置时回退到环境变量。

## 常用命令

```bash
npm run dev              # 启动开发服务器（端口 3000）
npm run build            # 生产构建
npm run start            # 启动生产服务器
npm run prisma:migrate   # 运行数据库迁移（开发）
npm run prisma:deploy    # 应用数据库迁移（生产）
npm run prisma:studio    # 打开数据库管理界面
npm run lint             # 代码检查
```

## 教学场景使用

本工具适合软件测试课程的团队实训：

1. **老师**注册账号 → 创建项目（自动成为管理员）
2. **学生**各自注册账号
3. 老师在**项目设置 → 团队成员**中输入学生邮箱，添加为 QA 角色
4. 学生登录后即可在项目中创建需求、用例、缺陷
5. 老师能看到所有学生的提交（带作者名），审计日志记录每一步操作

## 许可证

MIT License
