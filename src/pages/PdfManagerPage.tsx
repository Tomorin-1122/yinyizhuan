import { useEffect, useRef } from 'react'

export default function PdfManagerPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // When component mounts, check if the standalone page can be loaded
    const checkReady = setInterval(() => {
      try {
        const iframe = iframeRef.current
        if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
          clearInterval(checkReady)
        }
      } catch { /* PDF 管理器未就绪时忽略 */ }
    }, 500)
    return () => clearInterval(checkReady)
  }, [])

  return (
    <div className="w-full" style={{ height: 'calc(100vh - 56px)' }}>
      <iframe
        ref={iframeRef}
        src="/pdf-manager/index.html?embed=1"
        className="w-full h-full border-none"
        title="文献管理"
      />
    </div>
  )
}
