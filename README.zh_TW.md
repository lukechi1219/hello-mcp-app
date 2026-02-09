# Hello MCP App

多語言「Hello World」MCP App，搭配 iPhone 風格的淡入淡出動畫。使用 [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps) 建構，可直接在 Claude、ChatGPT、VS Code、Goose 等 AI 客戶端中渲染互動式 UI。

## 功能特色

- 15 種語言的平滑淡入淡出循環動畫
- 透過 MCP Apps 協定在沙盒 iframe 中渲染互動式 UI
- Host 主題整合（深色/淺色模式、CSS 變數、字型）
- 全螢幕切換與重新整理按鈕（雙向 tool 呼叫）
- 無狀態逐次請求架構，相容 serverless 環境

## 快速開始

```bash
pnpm install
pnpm build
```

## 部署方式

本 App 支援 3 種部署方式，涵蓋 2 個進入點：

| 方式 | 進入點 | 傳輸協定 | 模式 | 適用場景 |
|------|--------|----------|------|----------|
| [Claude Desktop (stdio)](#1-claude-desktop本機-stdio) | `stdio.ts` | stdio | 有狀態 | 本機開發與測試 |
| [Node.js HTTP](#2-nodejs-http-伺服器) | `node-http.ts` | Streamable HTTP | 無狀態 | VPS、雲端 VM、本機 HTTP |
| [Docker](#3-docker) | `node-http.ts` | Streamable HTTP | 無狀態 | Cloud Run、AWS ECS、容器平台 |

> **提示：** 使用 [ngrok](https://ngrok.com/) 將本機 HTTP 伺服器透過 HTTPS 暴露，供 ChatGPT 測試：`ngrok http 3000`

### 1. Claude Desktop（本機 stdio）

以本機子程序方式運行，由 Claude Desktop 管理。不需要網路。

**步驟：**

```bash
# 1. 建置專案
pnpm build

# 2. 確認輸出檔案存在
ls dist/entry/stdio.js
```

編輯 Claude Desktop 設定檔：
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "hello-world": {
      "command": "node",
      "args": ["/absolute/path/to/hello-mcp-app/dist/entry/stdio.js"]
    }
  }
}
```

```bash
# 3. 重新啟動 Claude Desktop
# 4. 在對話中輸入：「使用 hello-world 工具」
```

### 2. Node.js HTTP 伺服器

使用 Express v5 搭配 Streamable HTTP 傳輸。適用於 VPS、雲端 VM 或本機測試。

**步驟：**

```bash
# 開發模式（自動建置 UI）
pnpm dev:http

# 正式環境
pnpm build
pnpm start
```

**端點：**
- MCP: `http://localhost:3000/mcp`
- 健康檢查: `http://localhost:3000/health`

**環境變數：**
- `PORT` — 伺服器埠號（預設：`3000`）

**驗證：**

```bash
# 健康檢查
curl http://localhost:3000/health

# MCP 初始化測試
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}'
```

### 3. Docker

使用 Node.js 22 Alpine 的多階段建置。正式環境就緒的容器。

**步驟：**

```bash
# 1. 建置 Docker 映像檔
docker build -t hello-mcp .

# 2. 執行容器
docker run -p 3000:3000 hello-mcp

# 3. 驗證
curl http://localhost:3000/health
```

**自訂埠號：**

```bash
docker run -p 8080:3000 -e PORT=3000 hello-mcp
```

**部署到雲端容器平台：**

```bash
# Google Cloud Run
gcloud run deploy hello-mcp \
  --source . \
  --port 3000 \
  --allow-unauthenticated

# AWS App Runner（透過 ECR）
docker tag hello-mcp:latest <account-id>.dkr.ecr.<region>.amazonaws.com/hello-mcp:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/hello-mcp:latest

# Railway
railway up

# Fly.io
fly launch
fly deploy
```

**部署後的 MCP 端點：** `https://your-service-url.com/mcp`

## 連接 AI 客戶端

部署到 HTTPS 端點後，可連接任何 MCP 相容的客戶端：

### Claude Desktop（遠端）

1. 部署到任何 HTTPS 端點
2. Settings > Developer > Edit Config
3. 新增 URL：`https://your-server.com/mcp`

### Claude Web（遠端 MCP Connect）

1. 部署到任何 HTTPS 端點
2. Settings > Connectors > Add URL
3. 輸入：`https://your-server.com/mcp`

### ChatGPT

需要 HTTPS 端點。支援 MCP Apps UI 渲染（與 Claude 相同的互動式 UI）。

1. 部署到 HTTPS（Cloud Run、ngrok 等）
2. Settings > Connectors > Advanced > 啟用 Developer Mode
3. 新增 MCP connector，輸入你的 URL
4. 在對話中要求使用該工具

**支援：** SSE、Streamable HTTP | **認證：** OAuth、No Auth
**限制：** 不支援本機 MCP Server（必須 HTTPS）

### VS Code (Insiders)

1. 部署到任何 HTTPS 端點，或使用本機 stdio
2. 在 VS Code MCP 設定中配置

### Goose

1. 部署到任何 HTTPS 端點
2. 在 Goose 設定中新增 MCP Server URL

## 架構

```
hello-mcp-app/
├── src/
│   ├── core/                # 雲端無關的 MCP 伺服器核心
│   │   ├── greetings.ts     # 多語言問候資料（15 種語言）
│   │   └── create-server.ts # MCP 伺服器工廠（tools + resources）
│   ├── entry/               # 平台專屬進入點
│   │   ├── stdio.ts         # 本機測試（有狀態）
│   │   └── node-http.ts     # Express v5 + Streamable HTTP（無狀態）
│   └── ui/                  # iPhone 風格歡迎畫面
│       ├── mcp-app.html     # 主要 UI 結構
│       ├── mcp-app.ts       # MCP App SDK 客戶端（完整生命週期）
│       └── styles.css       # 動畫 + Host 主題 fallback
├── Dockerfile               # 多階段 Node.js 建置
└── package.json             # pnpm scripts 與相依套件
```

所有 HTTP 進入點使用**無狀態逐次請求**架構：每次請求都建立全新的 `McpServer` + transport，相容 serverless 環境。

## MCP Apps 生命週期

UI 客戶端實作完整的 MCP Apps 事件生命週期：

| 處理器 | 用途 |
|--------|------|
| `ontoolinput` | 接收 tool 輸入參數 |
| `ontoolresult` | 接收 tool 執行結果，更新問候語 |
| `onhostcontextchanged` | 套用 Host 主題、字型、安全區域邊距 |
| `onteardown` | 清除動畫計時器 |

| 動作 | 用途 |
|------|------|
| `callServerTool()` | 從伺服器重新取得問候語 |
| `requestDisplayMode()` | 切換全螢幕 |
| `sendLog()` | Debug 日誌發送到 Host |

## 開發指令

```bash
pnpm install          # 安裝相依套件
pnpm dev              # 透過 stdio 本機測試
pnpm dev:http         # HTTP 伺服器測試（埠 3000）
pnpm build            # 完整建置（UI + TypeScript）
pnpm build:ui         # 僅建置 UI bundle
pnpm start            # 啟動正式環境 HTTP 伺服器
```

## 技術棧

- **執行環境**: Node.js 18+
- **語言**: TypeScript（ES2022、strict mode）
- **MCP SDK**: `@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps`
- **傳輸**: Streamable HTTP
- **伺服器**: Express v5 搭配 `createMcpExpressApp`
- **建置**: Vite + `vite-plugin-singlefile`（單檔 HTML bundle）
- **套件管理**: pnpm

## 授權

MIT
