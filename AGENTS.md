# AGENTS.md — 引易转 (YinYiZhuan)

## Project

Academic citation format conversion tool for Chinese history scholars.
Converts between 《历史研究》、GB/T 7714-2015、APA 7th edition formats.
Supports 12 citation types (book, chapter, journal, newspaper, thesis, archive, ancient, electronic, conference, diary, transferred, classic).

**Stack:** React 18 + TypeScript + Vite 5 + Tailwind CSS + React Router 7
**Deploy:** Vercel (https://yinyizhuan.cn / https://yinyizhuan.vercel.app)
**Libs:** opencc-js (繁简转换), docx (Word export)

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # ESLint
npm run test      # vitest run
npm run preview   # vite preview
```

## Architecture

```
src/
├── lib/                    # Core logic (no React deps)
│   ├── types.ts           # Citation, ConversionRecord, TargetFormat types
│   ├── parser.ts          # Text parsing → Citation (~24KB, largest lib)
│   ├── publisher-places.ts # Publisher→city mapping (100+ entries)
│   ├── formatters/
│   │   ├── lsyj.ts       # 《历史研究》格式 (~16KB, most complex)
│   │   ├── gbt7714.ts    # GB/T 7714-2015
│   │   └── apa.ts        # APA 7th
│   ├── storage.ts         # localStorage persistence (max 500 records)
│   ├── metadata-fetcher.ts # URL/DOI/ISBN metadata fetch
│   ├── bibtex-parser.ts  # BibTeX file parsing
│   ├── ris-parser.ts     # RIS file parsing
│   └── export-word.ts    # Word document export
├── components/            # Shared UI (Layout, ManualForm, FileUploadArea, Icons)
├── pages/                 # HomePage, ConvertPage (~22KB), HistoryPage (~40KB), AboutPage
└── assets/
```

**Data flow:** Input → `parseCitationText()`/file parsers → `Citation` → `formatCitation()` → string → `addRecord()` to localStorage

## Conventions

- **Unicode:** Chinese must be real characters in TSX/JSX, never `\uXXXX` escapes
- **Lib purity:** `lib/` has zero React imports; components import from lib
- **Formatter pattern:** Each format is a function `(Citation) → string` in `lib/formatters/`
- **Parser pattern:** `parseCitationText()` tries parsers in priority: Douban → GB/T 7714 → Chinese/English heuristic
- **Storage:** All persistence via localStorage keys `yinyizhuan_history` / `yinyizhuan_tag_groups`
- **古籍子类型:** 7 sub-types via `ancientSubType` field (blockprint, punctuated, reprint, extract, gazetteer, classic, chronicle)

## Notes

- `lsyj.ts` exports `processBookTitleMarks` (used by "再次引证" feature in HistoryPage)
- Layout.tsx has CRLF line endings — must use write_file for full rewrites, edit_file may fail to match
- Deploy: `git push` first, then `vercel deploy --prod` (Vercel pulls from git)
- Chinese bash output garbles; use English/numeric in scripts
