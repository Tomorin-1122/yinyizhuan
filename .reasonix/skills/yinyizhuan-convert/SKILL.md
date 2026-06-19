---
name: yinyizhuan-convert
description: 调用引易转核心引擎，将学术引用文本转换为《历史研究》/ GB/T 7714 / APA 格式
---

## 引易转引用格式转换 Skill

将学术引用文本转换为《历史研究》/ GB/T 7714 / APA 格式。直接复用项目 `src/lib/` 的纯函数管线，通过 `npx tsx` 在 shell 中执行。

### 使用方式

当用户提供引用文本时，按以下流程操作：

#### 1. 确定输入格式

- **纯文本引用**（中文/英文/APA 格式）→ 用 `parseCitationText`
- **BibTeX 内容**（以 `@` 开头）→ 用 `parseBibTeX`
- **RIS 内容**（以 `TY  -` 开头）→ 用 `parseRIS`

#### 2. 确定输出格式

| 用户说法 | format 参数 |
|----------|-------------|
| 历史研究、《历史研究》、LSYJ | `lsyj` |
| GB/T 7714、国标、7714 | `gbt7714` |
| APA | `apa` |
| 未指定 | `lsyj`（默认） |

#### 3. 写入临时脚本并执行

在项目根目录写入 `_skill_convert.ts`，然后 `npx tsx _skill_convert.ts`，最后删除临时文件。

**脚本模板：**

```typescript
import { parseCitationText } from './src/lib/parser.ts';
import { parseBibTeX } from './src/lib/bibtex-parser.ts';
import { parseRIS } from './src/lib/ris-parser.ts';
import { formatCitation } from './src/lib/formatters/index.ts';
import type { TargetFormat } from './src/lib/types.ts';

// --- CONFIG ---
const INPUT_TEXT = `{{INPUT}}`;
const FORMAT: TargetFormat = '{{FORMAT}}';
const INPUT_TYPE = '{{INPUT_TYPE}}'; // text | bibtex | ris
// --- END CONFIG ---

function run() {
  if (INPUT_TYPE === 'bibtex') {
    const citations = parseBibTeX(INPUT_TEXT);
    for (const c of citations) {
      console.log(formatCitation(c as any, FORMAT));
      console.log('---');
    }
  } else if (INPUT_TYPE === 'ris') {
    const citations = parseRIS(INPUT_TEXT);
    for (const c of citations) {
      console.log(formatCitation(c as any, FORMAT));
      console.log('---');
    }
  } else {
    const citation = parseCitationText(INPUT_TEXT);
    console.log(formatCitation(citation, FORMAT));
  }
}

run();
```

执行命令：
```bash
cd {{PROJECT_ROOT}} && npx tsx _skill_convert.ts 2>/dev/null && rm _skill_convert.ts
```

`{{PROJECT_ROOT}}` = `C:/Users/31698/projects/yinyizhuan`

#### 4. 返回结果

将脚本输出原样返回给用户。如果有多条（BibTeX/RIS），逐条列出。

### 注意事项

- 工作目录必须是项目根目录，否则 import 路径找不到
- 输入文本中的反引号 `` ` `` 需转义，避免破坏模板字符串
- `npx tsx` 首次调用会安装 tsx（~5s），后续秒级响应
- 输出为 UTF-8 中文，确保 shell 编码正确
- 不要修改 `src/lib/` 下的任何源文件
