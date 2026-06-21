# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**引易转** (YinYiZhuan) - Academic citation format conversion tool for Chinese history scholars. Converts between 《历史研究》、GB/T 7714-2015、APA 7th edition formats. Supports 12 citation types including books, journals, dissertations, archives, ancient texts, etc.

- **访问地址**：https://yinyizhuan.cn（国内域名，指向 Vercel）
- **Vercel 部署**：https://yinyizhuan.vercel.app

## Development Commands

```bash
npm run dev       # Start dev server (Vite)
npm run build     # TypeScript + Vite production build
npm run lint      # ESLint check
npm run test      # Run tests (vitest)
npm run preview   # Preview production build
```

## Tech Stack

- React 18 + TypeScript + Vite 5
- Tailwind CSS (utility-first styling)
- React Router 7 (client-side routing)
- `opencc-js` - Chinese character conversion (simplified/traditional)
- `docx` - Word document export
- Deployed to Vercel

## Architecture

```
src/
├── lib/                    # Core logic (no React dependencies)
│   ├── types.ts           # Citation, ConversionRecord, TargetFormat types
│   ├── parser.ts          # Text parsing → Citation object (GB/T 7714, Douban, etc.)
│   ├── publisher-places.ts # Publisher → city mapping + auto-fill (100+ entries)
│   ├── formatters/        # Citation → formatted string
│   │   ├── lsyj.ts       # 《历史研究》格式 (primary target format)
│   │   ├── gbt7714.ts    # GB/T 7714-2015
│   │   └── apa.ts        # APA 7th
│   ├── storage.ts         # localStorage persistence (history, tag groups)
│   ├── metadata-fetcher.ts # URL/DOI/ISBN metadata retrieval
│   ├── bibtex-parser.ts  # BibTeX file parsing
│   ├── ris-parser.ts     # RIS file parsing
│   └── export-word.ts    # Word document export
├── components/            # Shared UI components
├── pages/                 # Route pages (HomePage, ConvertPage, HistoryPage, AboutPage)
└── assets/                # Static assets
```

## Key Data Flow

1. **Input** → `parseCitationText()` or file parsers (BibTeX/RIS) → `Citation` object
2. **Convert** → Formatter functions (`formatLsyj()`, `formatGbt7714()`, `formatApa()`) → formatted string
3. **Store** → `addRecord()` saves to localStorage (max 500 records)

## Citation Types

12 types defined in `CitationType`: book, chapter, journal, newspaper, thesis, archive, ancient, electronic, conference, diary, transferred, classic

## 《历史研究》 Format Notes

- Uses footnote style with inline annotations
- Author and title connected by colon (：)
- Book titles in 《》, article titles in quotes
- Published info comma-separated, pages at end

## Storage

All data persists in browser localStorage:
- `yinyizhuan_history` - conversion records (max 500)
- `yinyizhuan_tag_groups` - tag groups for organizing records

## Common Pitfalls

### Critical (高频踩坑)

1. **Unicode 转义乱码** — 写入 TSX/JSX/HTML 时，中文必须用真实字符，禁止 `\uXXXX` 转义形式，否则线上显示原始转义序列
2. **Vercel 部署顺序** — 必须先 `git push` 再 `vercel deploy`，否则服务端拉取的是旧代码。正确流程：
   ```bash
   git add . && git commit -m "..." && git push origin main
   npx vercel deploy --prod --yes --token <TOKEN>
   ```
3. **Layout.tsx CRLF 换行** — 该文件含 CRLF，edit 工具无法匹配，必须用 write 整体重写

### Other

- Chinese encoding: Bash output garbles Chinese; use English/numeric output in scripts
- File uploads: BibTeX/RIS parsers handle UTF-8; EndNote (.enl) requires special handling
- The `lsyj.ts` formatter is the most complex (~13KB) due to 12 citation type variations
- The `parser.ts` is the largest lib file (~19KB) with complex text parsing logic
- The `ConvertPage.tsx` is the largest page (~48KB) with rich conversion UI

## Deployment

- **Vercel CLI**: `cmd /c "npx vercel deploy --prod --yes --token <TOKEN> > deploy_log.txt 2>&1"`
- **验证方式**: 优先检查 dist JS bundle 是否含关键中文字符串（`powershell Select-String`），比浏览器截图快
- **vercel.json**: React Router 需要 rewrite `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
