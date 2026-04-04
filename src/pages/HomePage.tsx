import { Link } from 'react-router-dom'
import { IconArrowRight, IconEdit, IconHistory, IconCopy } from '../components/Icons'

const features = [
  {
    icon: IconEdit,
    title: '多种输入方式',
    desc: '支持手动填写、粘贴文本、URL导入、BibTeX/RIS文件上传',
  },
  {
    icon: IconCopy,
    title: '主流格式覆盖',
    desc: '《历史研究》、GB/T 7714、APA等学术引用规范一键转换',
  },
  {
    icon: IconHistory,
    title: '本地历史记录',
    desc: '转换结果自动保存，支持复制、导出、管理，数据安全存储于本地',
  },
]

export default function HomePage() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-parchment-100 via-parchment-50 to-white" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-vermilion-50 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-ink-100 rounded-full blur-3xl opacity-30 translate-y-1/2 -translate-x-1/4" />

        <div className="relative max-w-6xl mx-auto px-6 py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-block mb-6">
              <span className="font-mono text-xs tracking-widest text-ink-500 uppercase border border-ink-300 px-3 py-1">
                Academic Citation Converter
              </span>
            </div>

            <h1 className="font-display font-black text-5xl lg:text-7xl text-ink-950 leading-tight mb-6 tracking-tight">
              <span className="block">引用格式，</span>
              <span className="block text-vermilion-600">一键即转</span>
            </h1>

            <p className="text-lg lg:text-xl text-ink-600 leading-relaxed mb-10 max-w-xl font-body">
              专为学生、学者与研究人员设计的引用格式转换工具。
              告别手动调整的繁琐，专注于内容创作。
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/convert" className="btn-primary text-base group">
                开始转换
                <IconArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link to="/history" className="btn-secondary text-base">
                查看历史
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-12">
          <span className="font-mono text-xs tracking-widest text-ink-400 uppercase">核心功能</span>
          <h2 className="font-display font-bold text-3xl text-ink-950 mt-2">为什么选择引易转？</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-0">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={i}
                className={`p-8 border-2 border-ink-200 -ml-[2px] first:ml-0 transition-all duration-200 hover:border-ink-400 hover:bg-white animate-slide-up stagger-${i + 1} opacity-0`}
              >
                <div className="w-12 h-12 bg-ink-950 flex items-center justify-center mb-6">
                  <Icon className="w-6 h-6 text-parchment-50" />
                </div>
                <h3 className="font-display font-bold text-xl text-ink-950 mb-3">{f.title}</h3>
                <p className="text-ink-600 leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Formats */}
      <section className="bg-ink-950 text-parchment-50">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="mb-12">
            <span className="font-mono text-xs tracking-widest text-ink-400 uppercase">支持格式</span>
            <h2 className="font-display font-bold text-3xl text-parchment-50 mt-2">主流学术引用规范</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: '《历史研究》', tag: '首选', desc: '历史研究杂志社引文注释规范，覆盖著作、期刊、报纸、古籍、档案等全部文献类型' },
              { name: 'GB/T 7714-2015', tag: '国标', desc: '信息与文献 参考文献著录规则，国内学术论文最广泛使用的格式' },
              { name: 'APA 第7版', tag: '国际', desc: '美国心理学会引用格式，社会科学、教育学等领域广泛采用' },
            ].map((f, i) => (
              <div key={i} className="border border-ink-700 p-6 transition-all duration-200 hover:border-ink-500">
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-display font-bold text-lg">{f.name}</span>
                  <span className="font-mono text-xs bg-vermilion-600 text-white px-2 py-0.5">{f.tag}</span>
                </div>
                <p className="text-ink-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display font-bold text-3xl text-ink-950 mb-4">准备好了吗？</h2>
        <p className="text-ink-600 mb-8 max-w-md mx-auto">无需注册，无需登录，打开即用。所有数据存储在你的浏览器本地。</p>
        <Link to="/convert" className="btn-primary text-base inline-flex group">
          立即开始转换
          <IconArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </section>
    </div>
  )
}
