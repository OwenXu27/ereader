# Bilingual EPUB Reader

A minimalist, tech-retro style EPUB reader with bilingual translation powered by Moonshot AI (Kimi).

## Features

- **EPUB Parsing**: Upload and read local EPUB files.
- **Bilingual Translation**: Click on any paragraph to translate it from English to Chinese using Kimi K2.
- **Tech-Retro Style**: Minimalist UI inspired by Cursor, with Light/Dark/Sepia themes.
- **Responsive**: Adapts to desktop, tablet, and mobile.
- **Persistence**: Books are stored locally in IndexedDB; settings and progress are saved.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` to set:
   - `VITE_MOONSHOT_CHAT_COMPLETIONS_URL` (recommended: `/api/chat/completions`)
   - `VITE_MOONSHOT_MODEL` (example: `kimi-k2-turbo-preview`)
   - `MOONSHOT_API_KEY` (server-side, **no `VITE_` prefix**, do not commit)

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser at the local URL (usually http://localhost:5173).

## Usage

- **Add Book**: Click the "+" button in the Library to upload an EPUB.
- **Read**: Click on a book cover to open the reader.
- **Translate**: 
  1. Open Settings (gear icon).
  2. Enable "Translation".
  3. Paste your Moonshot API Key.
  4. In the reader, **click on any paragraph** to see the translation below it.
- **Theme**: Toggle Light/Dark mode in Settings.
- **Navigation**: Click left/right edges or use arrow keys (if focused) to turn pages.

## Deploy to Vercel (Free)

一键部署到 Vercel，让任何人都可以使用这个阅读器上传自己的书：

### 方式一：一键部署（推荐）

1. Fork 这个仓库到你的 GitHub
2. 访问 [Vercel](https://vercel.com)，用 GitHub 登录
3. 点击 "Add New Project" → 选择你 fork 的仓库
4. 在部署前，配置 **Environment Variables**：
   - `MOONSHOT_API_KEY`: 你的 Moonshot API Key（必填，在 [Moonshot 开放平台](https://platform.moonshot.cn/) 获取）
   - `MOONSHOT_UPSTREAM`: `https://api.moonshot.cn/v1/chat/completions`（可选，默认值）
5. 点击 "Deploy" 等待部署完成

### 方式二：Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署（首次会创建项目）
vercel

# 配置环境变量
vercel env add MOONSHOT_API_KEY production
# 输入你的 API Key

# 重新部署以应用环境变量
vercel --prod
```

### 部署后的使用

- 每个访问者可以上传自己的 EPUB 书籍
- 书籍存储在用户的浏览器本地（IndexedDB），不上传到服务器
- 翻译功能通过你配置的 API Key 使用 Moonshot AI
- 用户无需自己配置 API Key（除非他们想用自己的）

### 成本说明

- **Vercel**: 免费额度足够个人/小型使用
- **Moonshot API**: 有免费额度，超出后按量计费（很便宜）

## Technologies

- React + Vite
- Tailwind CSS
- epubjs
- Zustand (State Management)
- IDB (IndexedDB for storage)
- Moonshot AI API

## License

MIT
