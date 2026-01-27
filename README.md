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

一键部署到 Vercel，让任何人都可以使用这个阅读器：

### 部署步骤

1. Fork 这个仓库到你的 GitHub
2. 访问 [Vercel](https://vercel.com)，用 GitHub 登录
3. 点击 "Add New Project" → 选择你 fork 的仓库
4. 点击 "Deploy" 等待部署完成（无需配置环境变量）

### 用户如何使用

1. 访问你部署的网站
2. 上传自己的 EPUB 书籍（存在浏览器本地，不上传服务器）
3. 如需翻译功能：
   - 打开设置 → 开启 Translation
   - 填写 API URL: `https://api.moonshot.cn/v1`
   - 填写自己的 API Key（从 [platform.moonshot.cn](https://platform.moonshot.cn/) 免费获取）
4. 阅读时点击段落即可翻译

### 成本

- **Vercel 部署**: 完全免费
- **Moonshot API**: 每个用户用自己的 Key，新用户有免费额度

## Technologies

- React + Vite
- Tailwind CSS
- epubjs
- Zustand (State Management)
- IDB (IndexedDB for storage)
- Moonshot AI API

## License

MIT
