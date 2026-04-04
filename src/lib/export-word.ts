/**
 * 将历史记录导出为 Word (.docx) 文件
 * 使用 docx 库生成格式化的引用列表
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { ConversionRecord } from './types'
import { getCitationTypeName, getFormatName } from './utils'

/**
 * 将选中的历史记录导出为 Word 文件
 */
export function exportSelectedAsWord(
  records: ConversionRecord[],
  selectedIds: Set<string>
): void {
  const selected = records.filter(r => selectedIds.has(r.id))
  if (selected.length === 0) return

  const children: Paragraph[] = []

  // 标题
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: '引易转 — 引用格式列表',
          size: 36,
          bold: true,
          font: 'Noto Serif SC',
        }),
      ],
    }),
  )

  // 时间戳
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: `导出时间：${new Date().toLocaleString('zh-CN')}`,
          size: 20,
          color: '888888',
          font: 'Noto Sans SC',
        }),
      ],
    }),
  )

  // 分隔线
  children.push(
    new Paragraph({
      border: { bottom: { color: 'CCCCCC', space: 1, value: 'single', size: 6 } },
      spacing: { after: 200 },
      children: [],
    }),
  )

  // 逐条引用
  selected.forEach((r, i) => {
    // 序号 + 文献类型标签
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({
            text: `${i + 1}. `,
            size: 24,
            bold: true,
            font: 'Noto Sans SC',
          }),
          new TextRun({
            text: `[${getCitationTypeName(r.citation.type)}]`,
            size: 20,
            color: 'D93526',
            font: 'JetBrains Mono',
          }),
          new TextRun({
            text: `  — ${getFormatName(r.targetFormat)}`,
            size: 20,
            color: '666666',
            font: 'JetBrains Mono',
          }),
        ],
      }),
    )

    // 引用正文
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: r.result,
            size: 24,
            font: 'Noto Serif SC',
          }),
        ],
      }),
    )
  })

  // 底部说明
  children.push(
    new Paragraph({
      border: { top: { color: 'CCCCCC', space: 1, value: 'single', size: 6 } },
      spacing: { before: 300 },
      children: [],
    }),
  )
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: '由 引易转 (yinyizhuan.vercel.app) 自动生成',
          size: 18,
          color: 'AAAAAA',
          font: 'Noto Sans SC',
        }),
      ],
    }),
  )

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          run: { size: 24, font: 'Noto Sans SC' },
        },
      ],
    },
    sections: [{
      properties: {},
      children,
    }],
  })

  Packer.toBlob(doc).then(blob => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `引易转_引用_${Date.now()}.docx`
    a.click()
    URL.revokeObjectURL(url)
  })
}
