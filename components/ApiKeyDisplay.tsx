
import React from 'react';
import { CheckCircleIcon, AlertTriangleIcon, HelpCircleIcon } from './Icons';

interface ApiKeyDisplayProps {
  status: 'ok' | 'missing';
}

const ApiKeyDisplay: React.FC<ApiKeyDisplayProps> = ({ status }) => {
  let content;
  let iconColor = 'text-[#555555]';
  let textColor = 'text-[#555555]';

  switch (status) {
    case 'ok':
      iconColor = 'text-green-500'; 
      textColor = 'text-green-600'; 
      content = (
        <div className={`flex items-center ${textColor}`}>
          <CheckCircleIcon className={`mr-2 ${iconColor} w-4 h-4`} />
          <span>Gemini API 키가 설정되었습니다.</span>
        </div>
      );
      break;
    case 'missing':
    default:
      iconColor = 'text-[#E60012]';
      textColor = 'text-[#E60012]';
      content = (
        <div className={`flex items-center ${textColor}`}>
          <AlertTriangleIcon className={`mr-2 ${iconColor} w-4 h-4`} />
          <span>Gemini API 키를 입력하고 저장해주세요.</span>
        </div>
      );
      break;
  }

  return (
    <div className="text-xs p-1.5 bg-transparent rounded-md inline-block">
      {content}
    </div>
  );
};

export default ApiKeyDisplay;
