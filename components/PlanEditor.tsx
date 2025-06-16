
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PresentationPlanItem, OutputLanguage, SUPPORTED_LANGUAGES } from '../types';
import { DEFAULT_NUMBER_OF_SLIDES_IN_PLAN } from '../constants';
import { PlusCircleIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, LightBulbIcon, SparklesIcon, LoadingSpinner, LanguagesIcon, Edit3Icon, CheckIcon, XIcon, FileTextIcon, ImageIcon } from './Icons'; // Removed UploadCloudIcon as it's not used
import { generatePresentationPlan } from '../services/geminiService';

interface PlanEditorProps {
  documentText: string; 
  onDocumentTextChange: (newText: string) => void;
  presentationTitle: string; 
  initialPlan: PresentationPlanItem[];
  onPlanUpdate: (newPlan: PresentationPlanItem[]) => void;
  currentLanguage: OutputLanguage;
  onLanguageChange: (language: OutputLanguage) => void;
  numberOfSlides: number;
  onNumberOfSlidesChange: (num: number) => void;
  apiKeyStatus: 'missing' | 'valid';
  userApiKey: string;
}

const PlanEditor: React.FC<PlanEditorProps> = ({ 
    documentText, 
    onDocumentTextChange,
    presentationTitle,
    initialPlan,
    onPlanUpdate, 
    currentLanguage,
    onLanguageChange,
    numberOfSlides,
    onNumberOfSlidesChange,
    apiKeyStatus,
    userApiKey,
}) => {
  const [internalPlan, setInternalPlan] = useState<PresentationPlanItem[]>(initialPlan);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editText, setEditText] = useState<{ topic: string, summary: string }>({ topic: '', summary: '' });
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});


  useEffect(() => {
    const newPlanWithRefs = initialPlan.map(item => {
      if (!fileInputRefs.current[item.id]) {
        fileInputRefs.current[item.id] = null;
      }
      return item;
    });
    setInternalPlan(newPlanWithRefs);
  }, [initialPlan]);

  const handleGeneratePlan = useCallback(async () => {
    // API key checks removed, assuming process.env.API_KEY is handled by the service
    if (!documentText.trim() && !confirm("문서 텍스트가 비어 있습니다. 제목과 슬라이드 수를 기반으로 일반 계획을 생성하시겠습니까?")) {
      setPlanError("문서 텍스트를 제공하거나 일반 계획 생성을 확인하십시오.");
      return;
    }
    setIsGeneratingPlan(true);
    setPlanError(null);
    try {
      const planItemsFromService = await generatePresentationPlan(
        documentText, 
        presentationTitle, 
        currentLanguage, 
        numberOfSlides,
        userApiKey
      );
      const newPlan: PresentationPlanItem[] = planItemsFromService.map((item, index) => ({
        id: `plan-${Date.now()}-${index}`,
        slideNumber: index + 1,
        topic: item.topic,
        summary: item.summary,
        imageBase64: null,
        imageMimeType: null,
      }));
      setInternalPlan(newPlan);
      onPlanUpdate(newPlan);
    } catch (err) {
      console.error("프레젠테이션 계획 생성 실패:", err);
      setPlanError(err instanceof Error ? err.message : "계획 생성 중 알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [documentText, presentationTitle, currentLanguage, numberOfSlides, onPlanUpdate]);

  const addPlanItem = useCallback(() => {
    const newItemId = `custom-plan-${Date.now()}`;
    const newItem: PresentationPlanItem = {
      id: newItemId,
      slideNumber: internalPlan.length + 1,
      topic: `새 슬라이드 주제 ${internalPlan.length + 1}`,
      summary: '새 슬라이드 요약...',
      imageBase64: null,
      imageMimeType: null,
    };
    const updatedPlan = [...internalPlan, newItem].map((item, index) => ({ ...item, slideNumber: index + 1 }));
    setInternalPlan(updatedPlan);
    onPlanUpdate(updatedPlan);
  }, [internalPlan, onPlanUpdate]);

  const removePlanItem = useCallback((id: string) => {
    const updatedPlan = internalPlan.filter(item => item.id !== id).map((item, index) => ({ ...item, slideNumber: index + 1 }));
    delete fileInputRefs.current[id];
    setInternalPlan(updatedPlan);
    onPlanUpdate(updatedPlan);
  }, [internalPlan, onPlanUpdate]);

  const startEdit = (item: PresentationPlanItem) => {
    setEditingItemId(item.id);
    setEditText({ topic: item.topic, summary: item.summary });
  };

  const cancelEdit = () => {
    setEditingItemId(null);
  };

  const saveEdit = (id: string) => {
    if (!editingItemId) return;
    const updatedPlan = internalPlan.map(item => 
      item.id === id ? { ...item, topic: editText.topic, summary: editText.summary } : item
    );
    setInternalPlan(updatedPlan);
    onPlanUpdate(updatedPlan);
    setEditingItemId(null);
  };
  
  const moveItem = useCallback((index: number, direction: 'up' | 'down') => {
    const newItems = [...internalPlan];
    const item = newItems[index];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;

    if (swapIndex < 0 || swapIndex >= newItems.length) return;

    newItems[index] = newItems[swapIndex];
    newItems[swapIndex] = item;
    
    const finalItems = newItems.map((it, idx) => ({ ...it, slideNumber: idx + 1 }));
    setInternalPlan(finalItems);
    onPlanUpdate(finalItems);
  }, [internalPlan, onPlanUpdate]);

  const handleItemImageUpload = (itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        alert('지원되지 않는 이미지 형식입니다. JPG, PNG, WEBP, GIF 파일을 사용해주세요.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { 
        alert('이미지 파일이 너무 큽니다. 최대 5MB까지 허용됩니다.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const updatedPlan = internalPlan.map(item =>
          item.id === itemId ? { ...item, imageBase64: reader.result as string, imageMimeType: file.type } : item
        );
        setInternalPlan(updatedPlan);
        onPlanUpdate(updatedPlan);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeItemImage = (itemId: string) => {
    const updatedPlan = internalPlan.map(item =>
      item.id === itemId ? { ...item, imageBase64: null, imageMimeType: null } : item
    );
    setInternalPlan(updatedPlan);
    onPlanUpdate(updatedPlan);
    if (fileInputRefs.current[itemId]) {
        (fileInputRefs.current[itemId] as HTMLInputElement).value = "";
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl border border-[#C9BFB5]">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6">
        <h3 className="text-xl font-semibold mb-2 sm:mb-0 text-[#333333]">프레젠테이션: "<span className="text-black font-bold">{presentationTitle}</span>"</h3>
        <div className="flex items-center gap-2">
            <LanguagesIcon className="w-5 h-5 text-[#555555]"/>
            <label htmlFor="language-select" className="text-sm font-medium text-[#555555]">언어:</label>
            <select
                id="language-select"
                value={currentLanguage}
                onChange={(e) => onLanguageChange(e.target.value as OutputLanguage)}
                className="w-full sm:w-auto pl-3 pr-8 py-2 border-[#C9BFB5] focus:outline-none focus:ring-[#E60012] focus:border-[#E60012] text-sm rounded-md shadow-sm bg-white text-[#333333]"
            >
                {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
            </select>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-start">
            <label htmlFor="document-text-input" className="block text-sm font-medium text-[#555555] mb-1">
            문서 콘텐츠 (계획 생성용):
            </label>
        </div>
        <textarea
          id="document-text-input"
          value={documentText}
          onChange={(e) => onDocumentTextChange(e.target.value)}
          rows={8} 
          className="w-full p-3 border border-[#C9BFB5] rounded-md shadow-sm focus:ring-[#E60012] focus:border-[#E60012] text-sm bg-[#f8f8f8] text-[#333333]"
          placeholder="보고서, 기사 또는 메모를 여기에 붙여넣으세요..."
        />
        <p className="mt-1 text-xs text-[#777777]">글자 수: {documentText.length}. 이 텍스트는 AI가 프레젠테이션 계획을 만드는 데 사용됩니다.</p>
      </div>
      
      <div className="mb-6 p-4 border border-[#E0D8CD] bg-[#FAF6F0] rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <label htmlFor="num-slides" className="block text-sm font-medium text-[#555555] mb-1">
                계획에 포함할 슬라이드 수:
                </label>
                <input 
                    type="number" 
                    id="num-slides" 
                    value={numberOfSlides} 
                    onChange={(e) => onNumberOfSlidesChange(parseInt(e.target.value, 10) || DEFAULT_NUMBER_OF_SLIDES_IN_PLAN)}
                    min="1" 
                    max="20"
                    className="w-20 p-2 border border-[#C9BFB5] rounded-md shadow-sm focus:ring-[#E60012] focus:border-[#E60012] bg-white text-[#333333]"
                    disabled={isGeneratingPlan}
                />
            </div>
            <button
            onClick={handleGeneratePlan}
            disabled={isGeneratingPlan} // apiKeyStatus check removed
            className="mt-3 sm:mt-0 w-full sm:w-auto bg-[#E60012] hover:bg-[#B8000F] text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out flex items-center justify-center disabled:opacity-60"
            >
            {isGeneratingPlan ? (
                <> <LoadingSpinner className="w-5 h-5 mr-2" /> 계획 생성 중... </>
            ) : (
                <> <SparklesIcon className="w-5 h-5 mr-2" /> 계획 생성/재생성 </>
            )}
            </button>
        </div>
        {planError && <p className="mt-2 text-sm text-[#E60012]">{planError}</p>}
         <p className="mt-2 text-xs text-[#777777]">참고: 문서 텍스트 및 프레젠테이션 제목을 사용하여 {numberOfSlides}개 슬라이드 계획을 만듭니다. 각 항목에 이미지를 추가할 수 있습니다.</p>
      </div>
      
      <hr className="my-6 border-[#E0D8CD]" />

      <h4 className="text-lg font-semibold mb-3 text-[#333333]">현재 프레젠테이션 계획 (<span className="text-black font-bold">{internalPlan.length}</span> / {numberOfSlides}개 슬라이드, {SUPPORTED_LANGUAGES.find(l=>l.code === currentLanguage)?.name || currentLanguage}):</h4>
      {internalPlan.length === 0 && !isGeneratingPlan && (
        <p className="text-[#555555] text-center py-4">아직 계획 항목이 없습니다. 계획을 생성하거나 수동으로 항목을 추가하세요.</p>
      )}

      <div className="space-y-3 mb-6">
        {internalPlan.map((item, index) => (
          <div key={item.id} className="p-3 border border-[#C9BFB5] rounded-lg bg-white hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <span className="mt-1 font-semibold text-[#777777] text-sm">#{item.slideNumber}</span>
              <div className="flex-grow">
                {editingItemId === item.id ? (
                  <>
                    <input 
                      type="text" 
                      value={editText.topic} 
                      onChange={e => setEditText(prev => ({...prev, topic: e.target.value}))}
                      className="w-full p-2 mb-1 border border-[#E60012] rounded-md text-sm bg-white text-[#333333]"
                      placeholder="슬라이드 주제"
                    />
                    <textarea 
                      value={editText.summary}
                      onChange={e => setEditText(prev => ({...prev, summary: e.target.value}))}
                      rows={3}
                      className="w-full p-2 border border-[#E60012] rounded-md text-xs bg-white text-[#333333]"
                      placeholder="슬라이드 요약"
                    />
                  </>
                ) : (
                  <>
                    <h5 className="font-semibold text-black">{item.topic}</h5>
                    <p className="text-xs text-[#555555] mt-0.5 whitespace-pre-wrap">{item.summary}</p>
                  </>
                )}
                <div className="mt-2">
                    <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/webp, image/gif" 
                        onChange={(e) => handleItemImageUpload(item.id, e)}
                        className="hidden"
                        id={`file-input-${item.id}`}
                        ref={el => { fileInputRefs.current[item.id] = el; }}
                    />
                    {item.imageBase64 && item.imageMimeType ? (
                        <div className="mt-1">
                            <img src={item.imageBase64} alt={`슬라이드 ${item.slideNumber} 이미지 미리보기`} className="max-h-24 w-auto border border-[#E0D8CD] rounded shadow-sm mb-1" />
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => fileInputRefs.current[item.id]?.click()}
                                    className="text-xs bg-[#E0D8CD] hover:bg-[#C9BFB5] text-[#333333] px-2 py-1 rounded-sm shadow-sm"
                                >
                                    이미지 변경
                                </button>
                                <button 
                                    onClick={() => removeItemImage(item.id)}
                                    className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded-sm shadow-sm"
                                >
                                    이미지 제거
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={() => fileInputRefs.current[item.id]?.click()}
                            className="text-xs bg-[#E60012] hover:bg-[#B8000F] text-white px-2.5 py-1.5 rounded-md shadow-sm flex items-center"
                        >
                           <ImageIcon className="w-3 h-3 mr-1"/> 이 슬라이드에 이미지 추가
                        </button>
                    )}
                </div>
              </div>
              <div className="flex flex-col space-y-1 flex-shrink-0">
                {editingItemId === item.id ? (
                    <>
                        <button onClick={() => saveEdit(item.id)} className="p-1 text-green-600 hover:text-green-700" aria-label="변경 사항 저장"><CheckIcon /></button>
                        <button onClick={cancelEdit} className="p-1 text-[#E60012] hover:text-[#B8000F]" aria-label="편집 취소"><XIcon /></button>
                    </>
                ) : (
                    <button onClick={() => startEdit(item)} className="p-1 text-[#E60012] hover:text-[#B8000F]" aria-label="항목 편집"><Edit3Icon /></button>
                )}
                <button onClick={() => moveItem(index, 'up')} disabled={index === 0 || !!editingItemId} className="p-1 text-[#555555] hover:text-[#E60012] disabled:opacity-30" aria-label="위로 이동"><ChevronUpIcon /></button>
                <button onClick={() => moveItem(index, 'down')} disabled={index === internalPlan.length - 1 || !!editingItemId} className="p-1 text-[#555555] hover:text-[#E60012] disabled:opacity-30" aria-label="아래로 이동"><ChevronDownIcon /></button>
                <button onClick={() => removePlanItem(item.id)} disabled={!!editingItemId} className="p-1 text-[#E60012] hover:text-[#B8000F] disabled:opacity-30" aria-label="항목 삭제"><TrashIcon /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-2">
        <button
          onClick={addPlanItem}
          className="bg-[#E60012] hover:bg-[#B8000F] text-white font-semibold py-1.5 px-3 rounded-md shadow-sm transition flex items-center text-sm"
          aria-label="새 계획 항목 추가"
        >
          <PlusCircleIcon className="w-4 h-4 mr-1"/> 계획에 슬라이드 추가
        </button>
      </div>
       <div className="mt-6 p-3 bg-[#FAF6F0] border border-[#E0D8CD] rounded-md text-sm text-[#555555] flex items-start">
          <FileTextIcon className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0 text-[#E60012]" />
          <div>
            <strong>문서 입력:</strong> 위의 내용은 AI가 프레젠테이션 계획을 생성하는 데 사용됩니다. 생성하기 전에 필요에 따라 편집하십시오.
          </div>
      </div>
       <div className="mt-2 p-3 bg-[#FAF6F0] border border-[#E0D8CD] rounded-md text-sm text-[#555555] flex items-start">
          <ImageIcon className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0 text-[#E60012]" />
          <div>
            <strong>슬라이드별 이미지:</strong> 각 계획 항목에 이미지를 직접 업로드하여 해당 슬라이드의 주요 콘텐츠로 사용할 수 있습니다.
          </div>
      </div>
       <div className="mt-2 p-3 bg-[#FAF6F0] border border-[#E0D8CD] rounded-md text-sm text-[#555555] flex items-start">
          <LightBulbIcon className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0 text-[#E60012]" />
          <div>
            <strong>팁:</strong> 문서 텍스트를 편집한 후 원하는 슬라이드 수를 설정한 다음 계획을 생성하십시오. 그런 다음 전체 프레젠테이션 콘텐츠를 생성하기 전에 각 계획된 슬라이드의 주제, 요약 및 관련 이미지를 편집할 수 있습니다.
          </div>
      </div>
    </div>
  );
};

export default PlanEditor;
