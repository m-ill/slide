import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon, KeyIcon } from './Icons';

interface ApiKeyInputProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ apiKey, onApiKeyChange }) => {
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsEditing(false);
  };

  const maskedKey = apiKey ? `${apiKey.slice(0, 6)}${'*'.repeat(Math.max(0, apiKey.length - 10))}${apiKey.slice(-4)}` : '';

  return (
    <div className="mt-3 sm:mt-0">
      {!isEditing && apiKey ? (
        <div className="flex items-center gap-2">
          <KeyIcon className="w-4 h-4 text-[#555555]" />
          <span className="text-sm text-[#555555] font-mono">
            {showKey ? apiKey : maskedKey}
          </span>
          <button
            onClick={() => setShowKey(!showKey)}
            className="p-1 hover:bg-[#E0D8CD] rounded transition-colors"
            title={showKey ? "API 키 숨기기" : "API 키 보기"}
          >
            {showKey ? <EyeOffIcon className="w-4 h-4 text-[#777777]" /> : <EyeIcon className="w-4 h-4 text-[#777777]" />}
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-[#E60012] hover:text-[#B8000F] font-medium"
          >
            변경
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="Gemini API 키 입력"
            className="px-2 py-1 border border-[#C9BFB5] rounded text-sm focus:ring-[#E60012] focus:border-[#E60012] font-mono"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="p-1 hover:bg-[#E0D8CD] rounded transition-colors"
            title={showKey ? "API 키 숨기기" : "API 키 보기"}
          >
            {showKey ? <EyeOffIcon className="w-4 h-4 text-[#777777]" /> : <EyeIcon className="w-4 h-4 text-[#777777]" />}
          </button>
          <button
            type="submit"
            className="px-3 py-1 bg-[#E60012] hover:bg-[#B8000F] text-white text-sm rounded transition-colors"
          >
            확인
          </button>
          {apiKey && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-[#777777] hover:text-[#555555]"
            >
              취소
            </button>
          )}
        </form>
      )}
    </div>
  );
};

export default ApiKeyInput;