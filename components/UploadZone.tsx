
import React, { useCallback, useState } from 'react';
import { UploadCloudIcon, FileTextIcon, CheckCircleIcon, ImageIcon } from './Icons';

interface UploadZoneProps {
  onFileUpload: (content: string, fileName: string) => void;
  onImageUpload: (imageDataUrl: string, mimeType: string, fileName: string) => void;
  currentFileName: string | null;
  currentImagePreview?: string | null; 
}

const UploadZone: React.FC<UploadZoneProps> = ({ 
    onFileUpload, 
    onImageUpload, 
    currentFileName,
    currentImagePreview 
}) => {
  const [dragging, setDragging] = useState(false);
  const acceptedTextTypes = ".txt,.md,.pdf,.docx";
  const acceptedImageTypesArray = ['image/jpeg', 'image/png', 'image/webp'];
  const acceptedImageTypesString = acceptedImageTypesArray.join(',');
  const acceptedFileTypes = `${acceptedTextTypes},${acceptedImageTypesString}`;
  
  // Allowed file extensions for additional validation
  const allowedExtensions = ['.txt', '.md', '.pdf', '.docx', '.jpg', '.jpeg', '.png', '.webp'];


  const processFile = useCallback((file: File) => {
    // Size validation
    if (file.size > 20 * 1024 * 1024) { // Max 20MB
        alert("파일이 너무 큽니다. 최대 크기는 20MB입니다.");
        return;
    }
    
    // Extension validation
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
        alert(`허용되지 않는 파일 확장자: ${fileExtension}. ${allowedExtensions.join(', ')}만 허용됩니다.`);
        return;
    }

    if (acceptedImageTypesArray.includes(file.type)) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target?.result as string;
            onImageUpload(imageDataUrl, file.type, file.name);
        };
        reader.readAsDataURL(file);
    } else if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        // Basic content validation - check if text is not empty and not too large
        if (!text || text.trim().length === 0) {
            alert("빈 텍스트 파일입니다.");
            return;
        }
        if (text.length > 1000000) { // 1MB of text
            alert("텍스트 파일이 너무 큽니다 (1MB 초과).");
            return;
        }
        onFileUpload(text, file.name);
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.pdf') || file.name.endsWith('.docx')) {
      // For PDF, DOCX - current placeholder behavior.
      // Actual parsing for these would require additional libraries (e.g., pdf.js, mammoth.js)
      // and would likely be done in a web worker for performance.
      // For this demo, we'll simulate some text extraction for planning purposes.
      const simulatedText = `"${file.name}" 파일의 내용입니다. (참고: 이 데모에서는 PDF/DOCX의 실제 구문 분석은 구현되지 않았습니다. AI는 파일 이름과 이 자리 표시자 텍스트를 컨텍스트로 사용할 수 있습니다.)`;
      onFileUpload(simulatedText, file.name);
    } else {
      alert(`지원되지 않는 파일 형식입니다: ${file.type || file.name}. TXT, MD, PDF, DOCX, JPG, PNG, WEBP 파일만 허용됩니다.`);
      onFileUpload('', ''); // Clear previous file if any
    }
  }, [onFileUpload, onImageUpload]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handlePaste = useCallback(async (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (acceptedImageTypesArray.includes(items[i].type)) {
          const blob = items[i].getAsFile();
          if (blob) {
            // Validate pasted image size
            if (blob.size > 20 * 1024 * 1024) {
              alert("붙여넣은 이미지가 너무 큽니다. 최대 크기는 20MB입니다.");
              return;
            }
            const fileName = `pasted_image_${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
            const reader = new FileReader();
            reader.onload = (e) => {
              const imageDataUrl = e.target?.result as string;
              onImageUpload(imageDataUrl, blob.type, fileName);
            };
            reader.readAsDataURL(blob);
            event.preventDefault(); 
            return;
          }
        }
      }
    }
  }, [onImageUpload]);


  return (
    <div className="space-y-4" onPaste={handlePaste}>
        <label htmlFor="file-upload" className={`
            mt-1 flex justify-center px-6 pt-5 pb-6 border-2 
            ${dragging ? 'border-[#E60012] bg-[rgba(230,0,18,0.05)]' : 'border-[#C9BFB5] border-dashed'} 
            rounded-md cursor-pointer transition-colors duration-200 ease-in-out
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        aria-label="파일 업로드 영역: 클릭하거나 파일을 드래그 앤 드롭하세요. 이미지 붙여넣기도 가능합니다."
        tabIndex={0}
        onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') (document.getElementById('file-upload') as HTMLInputElement)?.click(); }}
        >
            <div className="space-y-1 text-center py-4">
            {currentFileName ? (
                 <>
                    {currentImagePreview ? 
                        <img src={currentImagePreview} alt="업로드된 이미지 미리보기" className="mx-auto h-20 w-auto max-w-xs object-contain mb-2 rounded border border-[#E0D8CD]" />
                        : <FileTextIcon className="mx-auto h-12 w-12 text-[#777777]" />
                    }
                    <CheckCircleIcon className="mx-auto h-8 w-8 text-green-500" />
                    <p className="text-lg font-medium text-[#333333]">파일 준비 완료!</p>
                    <p className="text-sm text-[#555555] truncate max-w-xs mx-auto" title={currentFileName}>{currentFileName}</p>
                    <p className="text-xs text-[#777777] mt-2">다른 파일을 드래그하거나 클릭하여 교체하세요.</p>
                </>
            ) : (
                <>
                    <UploadCloudIcon className={`mx-auto h-12 w-12 ${dragging ? 'text-[#E60012]' : 'text-[#777777]'}`} />
                    <div className="flex text-sm text-[#555555]">
                        <span className={`relative rounded-md font-medium ${dragging ? 'text-[#E60012]' : 'text-[#E60012] hover:text-[#B8000F]'} focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#E60012]`}>
                            <span>파일 업로드</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept={acceptedFileTypes} />
                        </span>
                        <p className="pl-1">또는 드래그 앤 드롭 또는 붙여넣기(이미지)</p>
                    </div>
                    <p className="text-xs text-[#777777]">TXT, MD, PDF, DOCX, JPG, PNG, WEBP 최대 20MB</p>
                    <p className="text-xs text-[#777777] mt-1">(PDF/DOCX 구문 분석은 컨셉 데모용입니다)</p>
                </>
            )}
            </div>
        </label>
        {!currentFileName && (
            <div className="text-sm text-center">
                 <label htmlFor="file-upload-button" className="cursor-pointer text-[#E60012] hover:text-[#B8000F] font-medium">
                    또는 여기를 클릭하여 파일을 선택하세요.
                    <input id="file-upload-button" name="file-upload-button" type="file" className="sr-only" onChange={handleFileChange} accept={acceptedFileTypes} />
                </label>
            </div>
        )}
        <div className="mt-4 p-3 bg-[#FAF6F0] border border-[#E0D8CD] rounded-md text-sm text-[#555555] flex items-start">
          <ImageIcon className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0 text-[#E60012]" />
          <div>
            <strong>팁:</strong> PDF, DOCX 또는 이미지 파일을 업로드하면 AI가 해당 파일의 내용, 색상 팔레트 및 스타일을 분석하여 슬라이드 생성에 활용합니다.
          </div>
      </div>
    </div>
  );
};

export default UploadZone;
