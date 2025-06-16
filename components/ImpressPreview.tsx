import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GeneratedSlideOutput } from '../types';
import { RefreshCwIcon, ChevronLeftIcon, ChevronRightIcon, InfoIcon, MessageSquareIcon, FileTextIcon } from './Icons';

interface ImpressPreviewProps {
  slides: GeneratedSlideOutput[];
  onRegenerateSlide: (planId: string) => void;
  isGenerating: boolean; 
}

const ImpressPreview: React.FC<ImpressPreviewProps> = ({ slides, onRegenerateSlide, isGenerating }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  useEffect(() => {
    if (slides.length > 0 && currentSlideIndex >= slides.length) {
      setCurrentSlideIndex(0);
    } else if (slides.length === 0) {
      setCurrentSlideIndex(0);
    }
  }, [slides, currentSlideIndex]);

  const currentVisibleSlide = slides[currentSlideIndex];

  useEffect(() => {
    if (currentVisibleSlide && currentVisibleSlide.slideHtml) {
      const timer = setTimeout(() => {
        if (typeof window.renderDynamicContent === 'function') {
          window.renderDynamicContent();
        }
      }, 150); 
      return () => clearTimeout(timer);
    }
  }, [currentVisibleSlide?.slideHtml, currentVisibleSlide?.itemImageBase64]); // Re-run if HTML or image changes


  if (slides.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-xl shadow-xl border border-[#C9BFB5] p-6">
        <InfoIcon className="w-12 h-12 text-[#777777] mx-auto mb-4" />
        <p className="text-[#333333]">아직 생성된 슬라이드가 없거나 계획이 비어 있습니다.</p>
        <p className="text-[#555555] text-sm">계획을 정의하고 프레젠테이션 콘텐츠를 생성하십시오.</p>
      </div>
    );
  }
  
  if (!currentVisibleSlide) {
    return <p className="text-center py-10 text-[#333333]">슬라이드 미리보기 로드 중...</p>;
  }

  const goToPreviousSlide = () => {
    setCurrentSlideIndex(prev => (prev > 0 ? prev - 1 : slides.length - 1));
  };

  const goToNextSlide = () => {
    setCurrentSlideIndex(prev => (prev < slides.length - 1 ? prev + 1 : 0));
  };

  let slideHtmlToShow = currentVisibleSlide.slideHtml;
  if (currentVisibleSlide.itemImageBase64 && currentVisibleSlide.slideHtml.includes('IMAGE_DATA_URI_PLACEHOLDER_FOR_SLIDE_ITEM')) {
    slideHtmlToShow = currentVisibleSlide.slideHtml.replace(
        /IMAGE_DATA_URI_PLACEHOLDER_FOR_SLIDE_ITEM/g,
        currentVisibleSlide.itemImageBase64
    );
  } else if (currentVisibleSlide.slideHtml.includes('IMAGE_DATA_URI_PLACEHOLDER_FOR_SLIDE_ITEM')) {
    console.warn(`Slide ${currentVisibleSlide.slideNumber} has an image placeholder but no image data.`);
  }

  // Sanitize HTML with DOMPurify
  if (typeof window !== 'undefined' && window.DOMPurify) {
    slideHtmlToShow = window.DOMPurify.sanitize(slideHtmlToShow, {
      ADD_TAGS: ['div', 'canvas', 'pre', 'code'],
      ADD_ATTR: ['class', 'style', 'data-processed', 'data-mermaid-id', 'data-chart-processed'],
      ALLOW_DATA_ATTR: true,
      KEEP_CONTENT: true
    });
  }


  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-xl mt-0 border border-[#C9BFB5]">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
        <h3 className="text-lg sm:text-xl font-semibold text-[#333333] truncate" title={currentVisibleSlide.title}>
          슬라이드 {currentSlideIndex + 1} / {slides.length}: <span className="font-bold text-black">{currentVisibleSlide.title}</span>
        </h3>
        <div className="flex items-center gap-2">
           <button
            onClick={() => onRegenerateSlide(currentVisibleSlide.planId)}
            disabled={isGenerating}
            className="p-2 text-sm bg-[rgba(230,0,18,0.08)] text-[#E60012] hover:bg-[rgba(230,0,18,0.15)] rounded-md shadow-sm transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            title="이 슬라이드의 콘텐츠(HTML, 연설문, PPTX)를 다시 생성합니다."
          >
            <RefreshCwIcon className="w-4 h-4 mr-1"/> 재생성
          </button>
          <button
            onClick={goToPreviousSlide}
            disabled={slides.length <= 1}
            className="p-2 bg-[#E0D8CD] hover:bg-[#C9BFB5] rounded-md shadow-sm disabled:opacity-50 text-[#333333]"
            aria-label="이전 슬라이드"
          >
            <ChevronLeftIcon />
          </button>
          <button
            onClick={goToNextSlide}
            disabled={slides.length <= 1}
            className="p-2 bg-[#E0D8CD] hover:bg-[#C9BFB5] rounded-md shadow-sm disabled:opacity-50 text-[#333333]"
            aria-label="다음 슬라이드"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="slide-preview-container-4-3">
            <div 
              className="slide-preview-content-4-3 bg-white"
              dangerouslySetInnerHTML={{ __html: slideHtmlToShow }}
              aria-label={`슬라이드 콘텐츠: ${currentVisibleSlide.title}`}
              key={`${currentVisibleSlide.planId}-${currentSlideIndex}-${currentVisibleSlide.itemImageBase64 ? 'img' : 'no-img'}`}
            />
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="p-3 bg-[#FAF6F0] border border-[#E0D8CD] rounded-lg h-60 sm:h-72 overflow-hidden flex flex-col">
            <h4 className="text-sm font-semibold text-[#E60012] mb-1 flex items-center">
              <MessageSquareIcon className="w-4 h-4 mr-1.5"/> 연설문
            </h4>
            <div className="prose prose-sm max-w-none text-xs whitespace-pre-wrap overflow-y-auto flex-grow">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentVisibleSlide.speechMd || "생성된 연설문 없음."}
              </ReactMarkdown>
            </div>
          </div>
          <div className="p-3 bg-[#FAF6F0] border border-[#E0D8CD] rounded-lg h-60 sm:h-72 overflow-hidden flex flex-col">
            <h4 className="text-sm font-semibold text-[#E60012] mb-1 flex items-center">
                <FileTextIcon className="w-4 h-4 mr-1.5" /> PPTX 마크다운 (데이터)
            </h4>
            <div className="prose prose-sm max-w-none text-xs whitespace-pre-wrap overflow-y-auto flex-grow">
                {currentVisibleSlide.slideMarkdownForPptx || "PPTX용 마크다운 생성 안 됨."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpressPreview;