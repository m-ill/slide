
import React, { useState, useCallback, useEffect } from 'react';
import { AppStep, PresentationPlanItem, GeneratedSlideOutput, OutputLanguage, SUPPORTED_LANGUAGES } from './types';
import { DEFAULT_NUMBER_OF_SLIDES_IN_PLAN, GEMINI_MODEL_TEXT } from './constants';
import UploadZone from './components/UploadZone';
import PlanEditor from './components/PlanEditor';
import ImpressPreview from './components/ImpressPreview';
import HtmlExportButton from './components/HtmlExportButton';
import { generateIndividualSlideOutputsFromPlanItem, generateDesignStyleGuideFromImage } from './services/geminiService';
import { LoadingSpinner, AlertTriangleIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon } from './components/Icons';
import ApiKeyInput from './components/ApiKeyInput';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD_CONFIG);
  const [presentationTitle, setPresentationTitle] = useState<string>('나의 AI 프레젠테이션');
  const [documentInputForPlan, setDocumentInputForPlan] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [designStyleGuideMd, setDesignStyleGuideMd] = useState<string | null>(null);
  const [isGeneratingStyleGuide, setIsGeneratingStyleGuide] = useState<boolean>(false);

  const [presentationPlan, setPresentationPlan] = useState<PresentationPlanItem[]>([]);
  const [numberOfSlidesInPlan, setNumberOfSlidesInPlan] = useState<number>(DEFAULT_NUMBER_OF_SLIDES_IN_PLAN);
  const [generatedSlideOutputs, setGeneratedSlideOutputs] = useState<GeneratedSlideOutput[]>([]);
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number, total: number, message: string }>({ current: 0, total: 0, message: '슬라이드 콘텐츠 생성 시작 중...' });
  const [error, setError] = useState<string | null>(null);

  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>('ko');
  
  // API Key state
  const [userApiKey, setUserApiKey] = useState<string>('');

  const handleFileUpload = useCallback((content: string, name: string) => {
    setDocumentInputForPlan(content);
    setFileName(name);
    setUploadedImageBase64(null); 
    setDesignStyleGuideMd(null);
    setError(null);
  }, []);

  const handleImageUpload = useCallback(async (imageDataUrl: string, mimeType: string, name: string) => {
    setUploadedImageBase64(imageDataUrl); 
    setFileName(name); 
    setDocumentInputForPlan(`사용자가 "${name}" 이미지를 업로드했습니다. 이 이미지는 프레젠테이션의 전반적인 컨텍스트 또는 영감으로 사용될 수 있으며, 이를 기반으로 디자인 스타일 가이드가 자동 생성됩니다.`);
    setError(null);
    setDesignStyleGuideMd(null);
    setIsGeneratingStyleGuide(true);

    try {
        const styleGuide = await generateDesignStyleGuideFromImage(imageDataUrl, mimeType, userApiKey);
        setDesignStyleGuideMd(styleGuide);
    } catch (err) {
        console.error("스타일 가이드 생성 실패:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`이미지에서 디자인 스타일 가이드를 생성하지 못했습니다: ${errorMessage}. 기본 슬라이드 생성이 진행됩니다.`);
        setDesignStyleGuideMd('');
    } finally {
        setIsGeneratingStyleGuide(false);
    }
  }, []);


  const handleDocumentInputForPlanChange = useCallback((newText: string) => {
    setDocumentInputForPlan(newText);
  }, []);

  const handleStartPlanDefinition = () => {
    setCurrentStep(AppStep.PLAN_DEFINITION);
    setError(null);
  };

  const handlePlanUpdate = useCallback((newPlan: PresentationPlanItem[]) => {
    setPresentationPlan(newPlan);
  }, []);

  const handleNumberOfSlidesChange = useCallback((num: number) => {
    setNumberOfSlidesInPlan(num);
  }, []);
  
  const handlePresentationTitleChange = useCallback((title: string) => {
    setPresentationTitle(title);
  }, []);

  const handleOutputLanguageChange = useCallback((lang: OutputLanguage) => {
    setOutputLanguage(lang);
  }, []);

  const createSlideOutput = (
    update: Partial<GeneratedSlideOutput> & { planId: string },
    planItem: PresentationPlanItem 
  ): GeneratedSlideOutput => {
    const effectiveHtml = (update.slideHtml && update.slideHtml.trim())
        ? update.slideHtml
        : `<div class='p-4 text-[#E60012] text-center font-[Noto Sans KR,sans-serif]'><strong>오류:</strong> 이 슬라이드의 생성된 HTML 콘텐츠가 비어 있거나 유효하지 않습니다. 재생성을 시도하거나 계획 항목을 확인하십시오.</div>`;
    const effectiveSpeechMd = (update.speechMd && update.speechMd.trim())
        ? update.speechMd
        : `오류: 이 슬라이드의 생성된 연설문이 비어 있거나 유효하지 않습니다. 다시 시도해주십시오.`;
    const effectivePptxMd = (update.slideMarkdownForPptx && update.slideMarkdownForPptx.trim())
        ? update.slideMarkdownForPptx
        : `# 오류: 콘텐츠 누락\n\n이 슬라이드의 생성된 PPTX 마크다운이 비어 있거나 유효하지 않습니다. 다시 시도해주십시오.`;

    return {
        planId: update.planId!,
        slideNumber: planItem.slideNumber,
        title: update.title || planItem.topic,
        slideHtml: effectiveHtml,
        speechMd: effectiveSpeechMd,
        slideMarkdownForPptx: effectivePptxMd,
        groundingChunks: update.groundingChunks || [],
        itemImageBase64: planItem.imageBase64,
        itemImageMimeType: planItem.imageMimeType,
    };
  };

  const handleGenerateFullPresentation = useCallback(async () => {
    if (presentationPlan.length === 0) {
      setError('프레젠테이션 계획이 비어 있습니다. 먼저 계획을 생성하거나 정의하십시오.');
      setCurrentStep(AppStep.PLAN_DEFINITION);
      return;
    }
    if (isGeneratingStyleGuide) {
        setError('이미지 스타일 가이드가 아직 생성 중입니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    setIsGenerating(true);
    setError(null);
    setCurrentStep(AppStep.GENERATING_CONTENT);
    setGeneratedSlideOutputs([]); 
    
    const totalSlidesToGenerate = presentationPlan.length;
    setGenerationProgress({ current: 0, total: totalSlidesToGenerate, message: '슬라이드 콘텐츠 생성 시작 중...' });

    const tempOutputs: GeneratedSlideOutput[] = [];

    try {
      for (let i = 0; i < presentationPlan.length; i++) {
        const planItem = presentationPlan[i];
        setGenerationProgress({ current: i, total: totalSlidesToGenerate, message: `슬라이드 ${i + 1} 콘텐츠 생성 중: ${planItem.topic}...` });
        
        const generator = generateIndividualSlideOutputsFromPlanItem(
            planItem, 
            presentationPlan, 
            documentInputForPlan, 
            presentationTitle, 
            outputLanguage,
            designStyleGuideMd,
            userApiKey
        );
        let finalOutputForSlide: GeneratedSlideOutput | null = null;

        for await (const update of generator) {
          if (update.isComplete) {
            finalOutputForSlide = createSlideOutput(update, planItem);
          }
        }
        if (finalOutputForSlide) {
            tempOutputs.push(finalOutputForSlide);
            setGeneratedSlideOutputs([...tempOutputs]); 
        } else {
             const errorFallbackHtml = `<div class='p-4 text-[#E60012] text-center font-[Noto Sans KR,sans-serif]'><strong>오류:</strong> "${planItem.topic}" 슬라이드 콘텐츠 생성에 실패했습니다. 생성 프로세스가 예상대로 완료되지 않았습니다.</div>`;
             tempOutputs.push(createSlideOutput({
                planId: planItem.id,
                title: `${planItem.topic} (생성 오류)`,
                slideHtml: errorFallbackHtml,
                speechMd: `오류: "${planItem.topic}"에 대한 연설문 생성에 실패했습니다.`,
                slideMarkdownForPptx: `# 오류: ${planItem.topic} 생성 실패\n\n콘텐츠를 생성할 수 없습니다.`
              }, planItem));
            setGeneratedSlideOutputs([...tempOutputs]);
        }
        setGenerationProgress({ current: i + 1, total: totalSlidesToGenerate, message: `슬라이드 ${i + 1} 완료` });
      }
      setCurrentStep(AppStep.PREVIEW_PRESENTATION);
    } catch (err) {
      console.error('프레젠테이션 전체 생성 오류:', err);
      setError(`프레젠테이션 생성에 실패했습니다. ${err instanceof Error ? err.message : String(err)}`);
      setCurrentStep(AppStep.PLAN_DEFINITION); 
    } finally {
      setIsGenerating(false);
    }
  }, [presentationPlan, documentInputForPlan, presentationTitle, outputLanguage, designStyleGuideMd, isGeneratingStyleGuide]);


  const handleRegenerateSingleSlide = useCallback(async (planIdToRegenerate: string) => {
    if (isGeneratingStyleGuide) {
        setError('이미지 스타일 가이드가 아직 생성 중입니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    const planItemToRegenerate = presentationPlan.find(p => p.id === planIdToRegenerate);
    if (!planItemToRegenerate) {
        setError("재생성할 슬라이드를 계획에서 찾을 수 없습니다.");
        return;
    }

    setIsGenerating(true); 
    setError(null);
    const slideIndexToUpdate = generatedSlideOutputs.findIndex(s => s.planId === planIdToRegenerate);

    if (slideIndexToUpdate !== -1) {
        setGeneratedSlideOutputs(prev => {
            const updated = [...prev];
            updated[slideIndexToUpdate].slideHtml = "<div class='p-4 text-center text-[#E60012] font-[Noto Sans KR,sans-serif]'><p>슬라이드 콘텐츠 재생성 중...</p></div>";
            updated[slideIndexToUpdate].speechMd = "연설문 재생성 중...";
            updated[slideIndexToUpdate].slideMarkdownForPptx = "PPTX 마크다운 재생성 중...";
            return updated;
        });
    }
    
    try {
        const generator = generateIndividualSlideOutputsFromPlanItem(
            planItemToRegenerate, 
            presentationPlan, 
            documentInputForPlan, 
            presentationTitle, 
            outputLanguage,
            designStyleGuideMd,
            userApiKey
        );
        let finalOutputForSlide: GeneratedSlideOutput | null = null;
        for await (const update of generator) {
            if (update.isComplete) {
                 finalOutputForSlide = createSlideOutput(update, planItemToRegenerate);
            }
        }

        if (finalOutputForSlide && slideIndexToUpdate !== -1) {
            setGeneratedSlideOutputs(prev => {
                const updated = [...prev];
                updated[slideIndexToUpdate] = finalOutputForSlide!;
                return updated;
            });
        } else if (finalOutputForSlide && slideIndexToUpdate === -1) { 
             setGeneratedSlideOutputs(prev => [...prev, finalOutputForSlide!]);
        } else {
            throw new Error("재생성 시 서비스에서 완전한 슬라이드 출력을 생성하지 못했습니다.");
        }

    } catch (err) {
        console.error('슬라이드 재생성 오류:', err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(`"${planItemToRegenerate.topic}" 슬라이드 재생성에 실패했습니다. ${errorMsg}`);
         if (slideIndexToUpdate !== -1) {
            setGeneratedSlideOutputs(prev => {
                const updated = [...prev];
                const regenFailedHtml = `<div class='p-4 text-[#E60012] text-center font-[Noto Sans KR,sans-serif]'>
                                            <p><strong class="text-black">"${planItemToRegenerate.topic}" 재생성 실패</strong></p>
                                            <p class='text-sm'>${errorMsg}</p>
                                            <p class='text-sm mt-2'>다시 재생성하거나 계획 항목을 조정할 수 있습니다.</p>
                                         </div>`;
                updated[slideIndexToUpdate].slideHtml = regenFailedHtml; 
                updated[slideIndexToUpdate].speechMd += "\n\n오류: 재생성 실패.";
                updated[slideIndexToUpdate].slideMarkdownForPptx += "\n\n# 재생성 실패";
                return updated;
            });
        }
    } finally {
        setIsGenerating(false);
    }
  }, [generatedSlideOutputs, presentationPlan, documentInputForPlan, presentationTitle, outputLanguage, designStyleGuideMd, isGeneratingStyleGuide]);

  const renderTopControlsContent = () => {
    switch (currentStep) {
      case AppStep.UPLOAD_CONFIG:
        return (
          <div className="w-full">
            <h2 className="text-xl font-semibold mb-1 text-center text-[#333333] border-b-2 border-[#E60012] pb-2">1단계: 업로드 및 구성</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="presentationTitle" className="block text-sm font-medium text-[#555555] mb-1">프레젠테이션 제목</label>
                <input
                  type="text"
                  id="presentationTitle"
                  value={presentationTitle}
                  onChange={(e) => handlePresentationTitleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-[#C9BFB5] rounded-md shadow-sm focus:ring-[#E60012] focus:border-[#E60012] bg-white text-[#333333]"
                  placeholder="예: 시장 동향 분석"
                />
              </div>
              <button
                onClick={handleStartPlanDefinition}
                disabled={isGeneratingStyleGuide}
                className="w-full bg-[#E60012] hover:bg-[#B8000F] text-white font-semibold py-2.5 px-4 rounded-md shadow-md transition duration-150 ease-in-out flex items-center justify-center disabled:opacity-50"
              >
                {isGeneratingStyleGuide ? 
                  <><LoadingSpinner className="mr-2 w-5 h-5"/> 스타일 가이드 분석 중...</> : 
                  <>다음: 프레젠테이션 계획 정의 <ChevronRightIcon className="ml-2"/></>
                }
              </button>
            </div>
          </div>
        );
      case AppStep.PLAN_DEFINITION:
        return (
          <div className="w-full">
            <h2 className="text-xl font-semibold mb-1 text-center text-[#333333] border-b-2 border-[#E60012] pb-2">2단계: 프레젠테이션 계획 정의 및 언어 설정</h2>
            <div className="mt-4 flex flex-wrap justify-between items-center gap-4">
                <button
                    onClick={() => setCurrentStep(AppStep.UPLOAD_CONFIG)}
                    className="bg-[#E0D8CD] hover:bg-[#C9BFB5] text-[#333333] font-semibold py-2.5 px-5 rounded-md shadow-sm transition duration-150 ease-in-out flex items-center"
                >
                    <ChevronLeftIcon className="mr-2"/> 업로드로 돌아가기
                </button>
                <button
                    onClick={handleGenerateFullPresentation}
                    disabled={isGenerating || presentationPlan.length === 0 || isGeneratingStyleGuide || !userApiKey}
                    className="bg-[#E60012] hover:bg-[#B8000F] text-white font-semibold py-2.5 px-5 rounded-md shadow-md transition duration-150 ease-in-out flex items-center disabled:opacity-50"
                >
                    <SparklesIcon className="mr-2"/> 전체 프레젠테이션 생성
                </button>
            </div>
          </div>
        );
      case AppStep.GENERATING_CONTENT:
         return <h2 className="text-xl font-semibold text-center text-[#333333] border-b-2 border-[#E60012] pb-2">프레젠테이션 생성 중...</h2>;
      case AppStep.PREVIEW_PRESENTATION:
        return (
          <div className="w-full">
             <h2 className="text-xl font-semibold mb-1 text-center text-[#333333] border-b-2 border-[#E60012] pb-2">3단계: 미리보기 및 내보내기</h2>
            <div className="mt-4 flex flex-wrap justify-between items-center gap-2 sm:gap-4">
                 <button
                    onClick={() => setCurrentStep(AppStep.PLAN_DEFINITION)}
                    className="bg-[#E0D8CD] hover:bg-[#C9BFB5] text-[#333333] font-semibold py-2 px-3 sm:px-4 rounded-md shadow-sm transition duration-150 ease-in-out flex items-center text-xs sm:text-sm"
                  >
                   <ChevronLeftIcon className="mr-1 sm:mr-2 w-4 h-4"/> 계획 수정
                  </button>
                <HtmlExportButton slides={generatedSlideOutputs} presentationTitle={presentationTitle} />
            </div>
          </div>
        );
      default: return null;
    }
  };

  const renderBottomContent = () => {
    switch (currentStep) {
      case AppStep.UPLOAD_CONFIG:
        return (
          <div className="w-full max-w-5xl mx-auto mt-0 bg-white p-6 sm:p-8 rounded-xl shadow-xl border border-[#C9BFB5]">
            <UploadZone 
              onFileUpload={handleFileUpload} 
              onImageUpload={handleImageUpload}
              currentFileName={fileName} 
              currentImagePreview={uploadedImageBase64}
            />
             {isGeneratingStyleGuide && (
                <div className="mt-4 flex items-center justify-center text-sm text-[#E60012]">
                    <LoadingSpinner className="w-5 h-5 mr-2" />
                    <span>업로드된 이미지에서 디자인 스타일 가이드를 생성하는 중입니다...</span>
                </div>
            )}
            {/* Design style guide display for debugging remains hidden by default */}
          </div>
        );
      case AppStep.PLAN_DEFINITION:
        return (
          <div className="w-full max-w-5xl mx-auto mt-0">
             <PlanEditor
                documentText={documentInputForPlan}
                onDocumentTextChange={handleDocumentInputForPlanChange}
                presentationTitle={presentationTitle}
                initialPlan={presentationPlan}
                onPlanUpdate={handlePlanUpdate}
                currentLanguage={outputLanguage}
                onLanguageChange={handleOutputLanguageChange}
                numberOfSlides={numberOfSlidesInPlan}
                onNumberOfSlidesChange={handleNumberOfSlidesChange}
                apiKeyStatus={userApiKey ? 'valid' : 'missing'}
                userApiKey={userApiKey}
            />
          </div>
        );
      case AppStep.GENERATING_CONTENT:
        return (
          <div className="w-full max-w-xl mx-auto text-center mt-0 bg-white p-8 rounded-xl shadow-xl border border-[#C9BFB5]">
              <LoadingSpinner className="w-16 h-16 text-[#E60012] mb-4" />
              <p className="text-[#333333] mb-1">{generationProgress.message}</p>
              <p className="text-[#555555] mb-2">언어: {SUPPORTED_LANGUAGES.find(l => l.code === outputLanguage)?.name || outputLanguage}.</p>
              <p className="text-sm text-[#777777]">모델: {GEMINI_MODEL_TEXT}</p>
              <div className="mt-4 w-full bg-[#E0D8CD] rounded-full h-4">
                <div 
                    className="bg-[#E60012] h-4 rounded-full transition-all duration-300 ease-linear" 
                    style={{ width: `${generationProgress.total > 0 ? (generationProgress.current / generationProgress.total) * 100 : 0}%` }}
                ></div>
              </div>
               <p className="mt-2 text-sm text-[#777777]">슬라이드 {generationProgress.current} / {generationProgress.total} 처리됨</p>
            </div>
        );
      case AppStep.PREVIEW_PRESENTATION:
        return (
          <div className="w-full max-w-6xl mx-auto mt-0">
            <ImpressPreview
                slides={generatedSlideOutputs}
                onRegenerateSlide={handleRegenerateSingleSlide}
                isGenerating={isGenerating || isGeneratingStyleGuide} 
            />
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F3E9DD] text-[#333333] flex flex-col">
      <main className="flex-grow py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Panel 1: App Header - API Key Input Removed */}
        <div id="app-header-panel" className="max-w-5xl mx-auto p-4 sm:p-6 bg-[#FAF6F0] shadow-lg rounded-xl mb-6 sm:mb-8 border border-[#E0D8CD]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#E60012]">S-Slide</h1>
              <p className="mt-1 text-md text-[#555555]">AI 기반 프레젠테이션 생성기</p>
            </div>
            <ApiKeyInput 
              apiKey={userApiKey} 
              onApiKeyChange={setUserApiKey} 
            />
          </div>
        </div>

        {/* Panel 2: Step-specific Controls */}
        <div id="step-controls-panel" className="max-w-5xl mx-auto p-4 sm:p-6 bg-[#FAF6F0] shadow-lg rounded-xl mb-6 sm:mb-8 border border-[#E0D8CD]">
          {renderTopControlsContent()}
        </div>
        
        {error && (
          <div className="mb-6 max-w-5xl mx-auto bg-[rgba(230,0,18,0.05)] border-l-4 border-[#E60012] text-[#E60012] p-4 rounded-md shadow-md" role="alert">
            <div className="flex">
              <div className="py-1"><AlertTriangleIcon className="mr-3 text-[#E60012]"/></div>
              <div>
                <p className="font-bold text-black">오류</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Main content area for each step */}
        <div id="bottom-content">
            {renderBottomContent()}
        </div>
      </main>

      <footer className="text-center py-6 border-t border-[#C9BFB5] bg-[#F3E9DD]">
        <p className="text-sm text-[#777777]">
          Google Gemini 기반.
        </p>
        <p className="text-xs text-[#777777] mt-1">
          단국대학교 리모델링연구소 허석재 박사 (mill@dankook.ac.kr) 제작.
        </p>
      </footer>
    </div>
  );
};

export default App;
