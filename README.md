# Repo2PDF

ソースコードをPDFに変換して保存・共有するためのツールです。
React, Hono, PDFKit, Vite, TailwindCSS などの技術を使用しています。

## 機能

- ローカルおよびリモート（GitHubなど）のリポジトリをスキャン
- ファイルツリーからPDFに含めたいファイルを選択
- シンタックスハイライト付きでコードをPDF化
- ダークモード対応のモダンなUI

## 技術スタック

- **Frontend**: React, TailwindCSS, Vite
- **Backend**: Hono (Node.js)
- **PDF Generation**: PDFKit, Highlight.js
- **Other**: WebSocket (progress updates)

## セットアップと実行

### 必要要件

- Node.js (v18以上推奨)
- pnpm

### インストール

```bash
pnpm install
```

### 開発環境の起動

フロントエンドとバックエンドを同時に起動します。

```bash
pnpm dev
```

ブラウザで `http://localhost:4004` にアクセスしてください。

### 本番ビルドと実行

```bash
pnpm build
pnpm start
```

本番モードでは `http://localhost:4000` で起動します。
