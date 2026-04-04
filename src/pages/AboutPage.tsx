import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconArrowRight, IconChevronDown } from '../components/Icons'

function IconInfo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function IconBook({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function IconCode({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

function IconMail({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function IconGitHub({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

const faqItems = [
  {
    q: '转换结果不准确怎么办？',
    a: '请检查输入信息的完整性和准确性。推荐使用手动填写功能进行校对和修正。',
  },
  {
    q: '支持哪些文件格式上传？',
    a: '目前支持 BibTeX (.bib)、RIS (.ris)、EndNote (.enl) 格式的文件上传。未来将支持更多格式。',
  },
  {
    q: '历史记录会保存多久？',
    a: '历史记录默认在浏览器本地存储中保存，除非用户手动清除，否则会长期保存。我们建议用户定期导出重要记录进行备份。',
  },
  {
    q: '可以同时转换多个引用吗？',
    a: '是的，我们提供批量转换功能。您可以将多个引用（如 GB/T 7714 格式列表）粘贴到批量转换区域，系统会自动识别并转换所有引用。',
  },
  {
    q: '是否支持更多引用格式？如古籍、档案？',
    a: '我们会持续更新支持的引用格式。古籍、档案等特殊文献格式已在开发计划中，敬请期待后续更新。',
  },
  {
    q: '这个项目开源吗？',
    a: '项目已经托管到 GitHub 平台。如需获取源代码或参与贡献，请联系作者获取访问权限。',
  },
]

const techStack = [
  { name: 'React 18', desc: '前端框架' },
  { name: 'TypeScript', desc: '类型安全' },
  { name: 'Vite 5', desc: '构建工具' },
  { name: 'Tailwind CSS', desc: '样式系统' },
  { name: 'React Router', desc: '前端路由' },
  { name: 'Vercel', desc: '部署平台' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-ink-200 dark:border-gray-700 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 cursor-pointer group"
      >
        <span className="font-medium text-ink-950 dark:text-gray-100 group-hover:text-vermilion-600 transition-colors">{q}</span>
        <IconChevronDown
          className={`w-5 h-5 text-ink-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-ink-600 dark:text-gray-400 leading-relaxed text-sm">{a}</p>
      )}
    </div>
  )
}

export default function AboutPage() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden border-b-2 border-ink-200 dark:border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-br from-parchment-100 via-parchment-50 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <span className="font-mono text-xs tracking-widest text-ink-400 uppercase">About</span>
          <h1 className="font-display font-black text-4xl sm:text-5xl text-ink-950 dark:text-gray-100 mt-2 mb-6 tracking-tight">
            关于引易转
          </h1>
          <p className="text-lg text-ink-600 dark:text-gray-400 leading-relaxed max-w-2xl">
            引易转是专为中国历史系学生、学者设计的引用格式转换工具。告别手动调整的繁琐，专注于内容创作。
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* 《历史研究》格式说明 */}
        <section className="py-12 sm:py-16 border-b-2 border-ink-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-ink-950 dark:bg-vermilion-600 flex items-center justify-center shrink-0">
              <IconBook className="w-5 h-5 text-parchment-50" />
            </div>
            <h2 className="font-display font-bold text-2xl text-ink-950 dark:text-gray-100">《历史研究》格式说明</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-parchment-50 dark:bg-gray-800 border-2 border-ink-200 dark:border-gray-700 p-6">
              <h3 className="font-display font-bold text-ink-950 dark:text-gray-100 mb-3">核心规范</h3>
              <ul className="space-y-2 text-sm text-ink-600 dark:text-gray-400 leading-relaxed">
                <li>· 采用脚注体例，随文出注</li>
                <li>· 责任者与题名之间用冒号（：）连接</li>
                <li>· 著作题名加书名号《》，期刊文章题名加引号</li>
                <li>· 出版信息用逗号分隔，末尾标注页码</li>
                <li>· 外文文献保留原文语言格式</li>
              </ul>
            </div>
            <div className="bg-parchment-50 dark:bg-gray-800 border-2 border-ink-200 dark:border-gray-700 p-6">
              <h3 className="font-display font-bold text-ink-950 dark:text-gray-100 mb-3">典型示例</h3>
              <ul className="space-y-3 text-sm text-ink-600 dark:text-gray-400 leading-relaxed font-mono">
                <li className="border-l-2 border-vermilion-400 pl-3">赵景深：《文坛忆旧》，北新书局，1948年，第43页。</li>
                <li className="border-l-2 border-vermilion-400 pl-3">王戎笙：《清代前期移民史》，《历史研究》1998年第3期。</li>
                <li className="border-l-2 border-vermilion-400 pl-3">伍强胜：《万斯同哲学思想研究》，博士学位论文，东南大学历史系，2020年。</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 使用说明 */}
        <section className="py-12 sm:py-16 border-b-2 border-ink-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-ink-950 dark:bg-vermilion-600 flex items-center justify-center shrink-0">
              <IconInfo className="w-5 h-5 text-parchment-50" />
            </div>
            <h2 className="font-display font-bold text-2xl text-ink-950 dark:text-gray-100">使用说明</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0">
            {[
              { step: '01', title: '选择输入方式', desc: '根据您的需求选择文本粘贴、手动输入、URL导入或文件上传。' },
              { step: '02', title: '选择目标格式', desc: '从《历史研究》、GB/T 7714、APA等多种格式中选择所需规范。' },
              { step: '03', title: '点击转换', desc: '系统将自动处理并生成符合规范的转换结果，可即时核对。' },
              { step: '04', title: '复制或下载', desc: '转换完成后，复制结果到剪贴板，或下载保存到本地备用。' },
            ].map((item, i) => (
              <div key={i} className="border-2 border-ink-200 dark:border-gray-700 -ml-[2px] first:ml-0 p-6 hover:border-ink-400 transition-colors">
                <div className="font-mono text-4xl font-bold text-ink-200 dark:text-gray-700 mb-4">{item.step}</div>
                <h3 className="font-display font-bold text-ink-950 dark:text-gray-100 mb-2">{item.title}</h3>
                <p className="text-sm text-ink-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <span className="shrink-0 font-bold">!</span>
            <span>注意：移动端可以使用但没有适配好，推荐在 PC 端打开。</span>
          </div>
          <div className="mt-6">
            <Link to="/convert" className="btn-primary inline-flex group">
              立即开始转换
              <IconArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 sm:py-16 border-b-2 border-ink-200 dark:border-gray-800">
          <h2 className="font-display font-bold text-2xl text-ink-950 dark:text-gray-100 mb-8">常见问题</h2>
          <div className="max-w-3xl">
            {faqItems.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* 技术栈 */}
        <section className="py-12 sm:py-16 border-b-2 border-ink-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-ink-950 dark:bg-vermilion-600 flex items-center justify-center shrink-0">
              <IconCode className="w-5 h-5 text-parchment-50" />
            </div>
            <h2 className="font-display font-bold text-2xl text-ink-950 dark:text-gray-100">技术栈</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-0">
            {techStack.map((t, i) => (
              <div key={i} className="border-2 border-ink-200 dark:border-gray-700 -ml-[2px] first:ml-0 p-5 text-center hover:border-ink-400 transition-colors">
                <div className="font-display font-bold text-ink-950 dark:text-gray-100 mb-1">{t.name}</div>
                <div className="text-xs text-ink-400 dark:text-gray-500 font-mono">{t.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 联系作者 */}
        <section className="py-12 sm:py-16 border-b-2 border-ink-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-ink-950 dark:bg-vermilion-600 flex items-center justify-center shrink-0">
              <IconMail className="w-5 h-5 text-parchment-50" />
            </div>
            <h2 className="font-display font-bold text-2xl text-ink-950 dark:text-gray-100">联系作者</h2>
          </div>
          <p className="text-ink-600 dark:text-gray-400 mb-6 max-w-xl">
            如有功能建议、Bug 反馈或合作意向，欢迎通过以下方式联系：
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://github.com/Tomorin-1122/yinyizhuan"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center gap-2"
            >
              <IconGitHub className="w-5 h-5" />
              GitHub 仓库
            </a>
            <a
              href="mailto:chenwenxuan915@gmail.com"
              className="btn-ghost inline-flex items-center gap-2"
            >
              <IconMail className="w-5 h-5" />
              chenwenxuan915@gmail.com
            </a>
          </div>
        </section>

        {/* 法律声明链接 */}
        <section className="py-10 sm:py-12">
          <p className="text-sm text-ink-500 dark:text-gray-500 leading-relaxed">
            使用本网站即表示您已阅读并同意我们的{' '}
            <a
              href="#disclaimer"
              className="text-ink-800 dark:text-gray-300 underline underline-offset-2 hover:text-vermilion-600 transition-colors"
            >
              使用条款与免责声明
            </a>
            。
          </p>

          {/* 免责声明折叠区 */}
          <div id="disclaimer" className="mt-6">
            <DisclaimerSection />
          </div>
        </section>

      </div>
    </div>
  )
}

function DisclaimerSection() {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-2 border-ink-200 dark:border-gray-700">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer group"
      >
        <span className="font-display font-bold text-ink-950 dark:text-gray-100 group-hover:text-vermilion-600 transition-colors">
          使用条款与免责声明（测试阶段）
        </span>
        <IconChevronDown
          className={`w-5 h-5 text-ink-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-ink-200 dark:border-gray-700">
          <div className="pt-4 text-sm text-ink-600 dark:text-gray-400 leading-relaxed space-y-4 max-h-96 overflow-y-auto pr-2">
            <p className="font-medium text-ink-800 dark:text-gray-200">
              重要说明：本网站尚处在小范围测试阶段，为确保服务稳定性和用户体验，特制定本免责声明。请所有访问者在使用本网站前仔细阅读并理解以下条款。一旦您访问、浏览或使用本网站，即表示您已明知、理解并自愿接受本声明的全部约束。
            </p>
            <div>
              <h4 className="font-bold text-ink-900 dark:text-gray-200 mb-1">一、测试阶段特别声明</h4>
              <p>本网站目前处于小范围测试阶段，各项功能和服务可能随时进行调整、优化或暂停。测试期间，网站可能因系统维护、功能升级等原因而暂时中断服务。本网站所提供的所有信息仅供用户参考使用，不构成任何专业意见或决策依据。用户应自行对信息的准确性进行核实。</p>
            </div>
            <div>
              <h4 className="font-bold text-ink-900 dark:text-gray-200 mb-1">二、用户内容责任</h4>
              <p>用户在本网站上传、发布、提交或存储的任何内容，其著作权、所有权及相关权益均归该用户或原始权利人所有。用户须单独对任何以其账号名义进行的上传、下载、发布、传输、存储的用户内容承担完全责任。</p>
            </div>
            <div>
              <h4 className="font-bold text-ink-900 dark:text-gray-200 mb-1">三、知识产权保护</h4>
              <p>本网站内凡注明"原创"的所有文字、图片、音视频等稿件均属本网站原创内容，版权归本网站所有。未经本网站书面授权，任何媒体、网站或个人不得转载、链接或以其他方式复制发表。</p>
            </div>
            <div>
              <h4 className="font-bold text-ink-900 dark:text-gray-200 mb-1">四、隐私与数据安全</h4>
              <p>本网站尊重并将采取适当措施保护用户隐私。我们收集的信息将用于改善网站功能、优化用户体验。除非根据法律或政府的强制性规定，在未得到用户的许可之前，本网站不会把任何用户信息提供给任何无关的第三方。</p>
            </div>
            <div>
              <h4 className="font-bold text-ink-900 dark:text-gray-200 mb-1">五、外部链接与不可抗力</h4>
              <p>本网站可能包含指向第三方网站的链接，这些链接仅为用户提供便利。因黑客攻击、计算机病毒侵入、政府管制等不可抗力因素导致的网站服务中断、数据丢失或泄露等，本网站不承担任何法律责任。</p>
            </div>
            <div>
              <h4 className="font-bold text-ink-900 dark:text-gray-200 mb-1">六、用户行为规范</h4>
              <p>用户在使用本网站时，应遵守国家法律法规、社会公德及本网站的相关规定。禁止制作、复制、发布、传播具有反动、色情、暴力等内容的信息。</p>
            </div>
            <div>
              <h4 className="font-bold text-ink-900 dark:text-gray-200 mb-1">七、责任限制与法律适用</h4>
              <p>本免责声明的解释、效力及争议解决均适用中华人民共和国法律。凡以任何方式登录本网站或直接、间接使用本网站资料者，视为自愿接受本网站声明的约束。</p>
            </div>
            <p className="text-ink-400 dark:text-gray-500 text-xs pt-2 border-t border-ink-100 dark:border-gray-700">
              发布日期：2026年04月04日 &nbsp;|&nbsp; 生效日期：自发布之日起生效
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
