// 构建前把权威古籍数据同步到 public/，避免仓库里存两份内容完全相同的 11MB 文件。
//
// 两个消费方：
//   前端 src/components/AncientBookSearch.tsx  fetch('/ancient-books.json')（静态资源）
//   后端 lib/ancient-db.js                     fs.readFile('lib/ancient-books-all.json')
//
// 权威副本是 lib/ancient-books-all.json；public/ancient-books.json 已从 git 移除，
// 由本脚本在 dev / build 前重新生成，所以克隆仓库后不需要手动拷贝。
import { copyFileSync, existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'lib', 'ancient-books-all.json')
const dest = join(root, 'public', 'ancient-books.json')

if (!existsSync(src)) {
  console.error('[ancient-data] 找不到源文件:', src)
  process.exit(1)
}

const upToDate =
  existsSync(dest) &&
  statSync(dest).size === statSync(src).size &&
  readFileSync(dest).equals(readFileSync(src))

if (upToDate) {
  console.log('[ancient-data] public/ancient-books.json 已是最新，跳过')
} else {
  copyFileSync(src, dest)
  console.log('[ancient-data] 已生成 public/ancient-books.json')
}
