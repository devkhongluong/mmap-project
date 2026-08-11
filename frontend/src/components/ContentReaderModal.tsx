import React, { useState, useEffect } from 'react';

interface Material {
  materialId: number;
  title: string;
  contentType: 'link' | 'youtube' | 'text';
  content: string;
}

interface ContentReaderModalProps {
  material: Material | null;
  onClose: () => void;
}

export function ContentReaderModal({ material, onClose }: ContentReaderModalProps) {
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    if (material) {
      setIframeError(false);
      // Ngăn cuộn trang nền khi mở modal
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [material]);

  if (!material) return null;

  const isYt = material.contentType === 'youtube';
  const isLink = material.contentType === 'link';
  const isText = material.contentType === 'text';

  // Lấy domain cho link
  let domain = '';
  if (isLink || isYt) {
    try {
      domain = new URL(material.content || '').hostname.replace('www.', '');
    } catch {
      domain = 'Liên kết ngoài';
    }
  }

  // Xử lý YouTube URL để lấy link embed hợp lệ
  let embedUrl = material.content || '';
  if (isYt && material.content) {
    const match = material.content.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
    if (match) {
      embedUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
  }

  // Uớc tính thời gian đọc (giả sử 250 từ/phút)
  const wordCount = isText && material.content ? material.content.split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 250));

  // Tự động đóng nếu nhấn phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Nền bấm để đóng */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/95 backdrop-blur z-10 sticky top-0">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              {isYt ? (
                <span className="text-xl">▶️</span>
              ) : isLink ? (
                <span className="text-xl">🔗</span>
              ) : (
                <span className="text-xl">📚</span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-800 truncate">{material.title}</h2>
              <p className="text-sm text-gray-500 truncate">
                {isText ? `Ước tính đọc: ~${readTime} phút` : domain}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {(isLink || isYt) && (
              <a
                href={material.content}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                title="Mở trong tab mới"
              >
                Mở tab mới
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Nội dung chính */}
        <div className="flex-grow overflow-auto bg-gray-50/50">
          {isText ? (
            <div className="max-w-3xl mx-auto px-6 py-10 lg:px-12">
              <div className="prose prose-lg prose-blue max-w-none text-gray-800 leading-[1.8] whitespace-pre-line format-text">
                {formatMarkdown(material.content)}
              </div>
            </div>
          ) : (
            <div className="w-full h-full relative bg-gray-100 flex items-center justify-center">
              {iframeError ? (
                <div className="text-center p-8 max-w-md">
                  <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Không thể tải trang web này</h3>
                  <p className="text-sm text-gray-600 mb-6">Trang web này chặn hiển thị trong khung ứng dụng (X-Frame-Options). Bạn cần mở trực tiếp bằng tab mới để xem.</p>
                  <a
                    href={material.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                  >
                    Mở tab mới để học
                  </a>
                </div>
              ) : (
                <iframe
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                  onError={() => setIframeError(true)}
                  onLoad={(e) => {
                    // Simple hack to guess if it failed to load, though browsers often don't trigger onError for X-Frame-Options
                    // So we provide the "Mở tab mới" button in the header just in case.
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        
        /* Typography overrides */
        .format-text h2 { font-size: 1.5rem; font-weight: 800; margin-top: 2rem; margin-bottom: 1rem; color: #1e293b; }
        .format-text h3 { font-size: 1.25rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #334155; }
        .format-text p { margin-bottom: 1.25rem; }
        .format-text ul, .format-text ol { margin-bottom: 1.25rem; padding-left: 1.5rem; }
        .format-text li { margin-bottom: 0.5rem; }
        .format-text strong { font-weight: 700; color: #0f172a; }
      `}} />
    </div>
  );
}

// Hàm format markdown đơn giản (giữ nguyên whitespace-pre-line để tự động xuống dòng)
// Parse các thẻ Header (##, ###) và In đậm (**)
function formatMarkdown(text: string) {
  if (!text) return null;
  // Tách dòng để xử lý
  const lines = text.split('\n');
  const rendered = lines.map((line, index) => {
    // Header 3
    if (line.startsWith('### ')) {
      return <h3 key={index}>{parseInline(line.substring(4))}</h3>;
    }
    // Header 2
    if (line.startsWith('## ')) {
      return <h2 key={index}>{parseInline(line.substring(3))}</h2>;
    }
    // Bullet
    if (line.trim().startsWith('- ')) {
      return <li key={index} className="list-disc ml-5">{parseInline(line.trim().substring(2))}</li>;
    }
    // Default Text
    return <React.Fragment key={index}>{parseInline(line)}<br/></React.Fragment>;
  });

  return <>{rendered}</>;
}

function parseInline(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
