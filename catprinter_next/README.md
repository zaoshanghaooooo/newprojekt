# 猫猫打印系统 Next.js 版本

这是一个使用Next.js重构的猫猫打印系统，用于管理打印订单和设备。

## 技术栈

- **前端框架**: Next.js 14
- **UI组件**: Ant Design
- **数据库ORM**: Prisma
- **数据库**: SQLite (开发) / PostgreSQL (生产可选)
- **API**: Next.js API Routes
- **类型检查**: TypeScript

## 项目结构

```
catprinter_next/
├── prisma/              # Prisma数据库模型和迁移
├── public/              # 静态资源
└── src/
    ├── app/             # Next.js应用页面和API
    │   ├── api/         # API路由
    │   ├── orders/      # 订单页面
    │   └── ...          # 其他页面
    ├── db/              # 数据库实体和配置
    │   └── entities/    # 数据实体定义
    └── lib/             # 工具函数和服务
```

## 环境变量配置

为了运行此项目，您需要在项目根目录下创建一个`.env.local`文件，并包含以下环境变量：

```
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # 添加服务角色密钥，用于服务器端API绕过RLS策略

# 飞鹅云打印机配置
FEIE_USER=your-feie-user
FEIE_UKEY=your-feie-ukey
FEIE_SN=your-printer-sn

# 飞鹅云打印机配置
# 中国区域: http://api.feieyun.cn/Api/Open/
# 德国区域: http://api.de.feieyun.com/Api/Open/
FEIEYUN_URL=http://api.feieyun.cn/Api/Open/
FEIEYUN_USER=飞鹅云账号
FEIEYUN_UKEY=飞鹅云UKEY密钥
FEIEYUN_SN=打印机序列号
```

注意：`SUPABASE_SERVICE_ROLE_KEY`是服务器端API用来绕过RLS策略的密钥，可以在Supabase项目设置->API页面找到。

## 开发指南

### 环境设置

1. 克隆仓库
2. 安装依赖
   ```
   npm install
   ```
3. 设置环境变量
   创建`.env.local`文件：
   ```
   DATABASE_URL=file:./db.sqlite
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   ```
4. 初始化数据库
   ```
   npx prisma generate
   npx prisma db push
   ```
5. 启动开发服务器
   ```
   npm run dev
   ```

## API端点

- `GET /api/orders` - 获取所有订单
- `POST /api/orders` - 创建新订单
- `GET /api/orders/[id]` - 获取特定订单
- `PUT /api/orders/[id]` - 更新订单
- `DELETE /api/orders/[id]` - 删除订单
- `POST /api/print` - 发送打印请求

## 系统健康检查

该项目包含一个自动化的数据库连接读写检查机制，会在以下几个情况下运行：

1. 应用程序启动时（非开发环境）
2. 通过API端点 `/api/health` 手动触发
3. 通过管理界面 `/settings/health` 查看

### 健康检查功能

- 测试数据库连接状态
- 验证数据库读取功能
- 验证数据库写入功能
- 提供详细的健康状态报告

### 健康检查结果

健康检查API返回以下格式的JSON响应：

```json
{
  "status": "healthy",
  "timestamp": "2023-06-15T10:30:00.000Z",
  "services": {
    "database": {
      "status": "up",
      "details": {
        "connection": true,
        "read": true,
        "write": true,
        "message": "数据库连接和读写检查成功"
      }
    },
    "api": {
      "status": "up"
    }
  }
}
```

### 设置健康检查表

系统启动时会自动验证health_checks表是否存在。如果需要手动创建，可以运行以下SQL：

```sql
CREATE TABLE IF NOT EXISTS health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_key TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 部署

### Vercel部署

1. 安装Vercel CLI
   ```
   npm i -g vercel
   ```
2. 部署
   ```
   vercel
   ```

## 许可证

MIT 