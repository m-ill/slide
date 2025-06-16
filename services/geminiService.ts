
import { GoogleGenAI, GenerateContentResponse, GroundingChunk as GenAIGroundingChunk, GenerateContentParameters, Part } from '@google/genai';
import { PresentationPlanItem, GeneratedSlideOutput, GroundingChunk, OutputLanguage, SUPPORTED_LANGUAGES, OutlineItem } from '../types';
import { GEMINI_MODEL_TEXT } from '../constants';


function parseAndCleanJsonString(jsonStr: string): any {
    let cleanedStr = jsonStr.trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleanedStr.match(fenceRegex);
    if (match && match[1]) { 
        cleanedStr = match[1].trim();
    }

    try {
        return JSON.parse(cleanedStr);
    } catch (e: any) {
        if (e.message && (e.message.includes("Unexpected non-whitespace character after JSON") || 
                           (e.message.includes("Unexpected token") && cleanedStr.endsWith("undefined")))) {
            console.warn("초기 JSON 구문 분석 실패, 후행 문자 제거 시도 중. 오류:", e.message);
            
            let endOfJson = -1;
            let firstStructuralChar = '';
            for (let i = 0; i < cleanedStr.length; i++) {
                if (cleanedStr[i] === '{' || cleanedStr[i] === '[') {
                    firstStructuralChar = cleanedStr[i];
                    break;
                }
            }
            
            if (firstStructuralChar === '{') {
                endOfJson = cleanedStr.lastIndexOf('}');
            } else if (firstStructuralChar === '[') {
                endOfJson = cleanedStr.lastIndexOf(']');
            } else {
                endOfJson = Math.max(cleanedStr.lastIndexOf('}'), cleanedStr.lastIndexOf(']'));
            }

            if (endOfJson > -1) {
                const potentiallyCorrectedJson = cleanedStr.substring(0, endOfJson + 1);
                try {
                    const parsed = JSON.parse(potentiallyCorrectedJson);
                    console.info("후행 문자 제거 후 JSON 구문 분석 성공.");
                    return parsed;
                } catch (e2) {
                    console.error("두 번째 JSON 구문 분석 시도 (후행 문자 제거 후) 실패:", e2, "\n기본 구문 분석을 위한 원본 문자열:", jsonStr, "\n두 번째 구문 분석을 위한 시도된 문자열:", potentiallyCorrectedJson);
                }
            }
        }
        console.error("LLM 응답에서 JSON 구문 분석 실패. 원본 오류:", e, "\n구문 분석 시도 문자열:", cleanedStr, "\n전체 입력 문자열:", jsonStr);
        throw new Error(`LLM의 JSON 응답이 유효하지 않습니다. 구문 분석 실패. 원본 텍스트 조각 (최대 500자): ${jsonStr.substring(0,500)}`);
    }
}

function convertGenAIGroundingChunks(genAiChunks?: GenAIGroundingChunk[]): GroundingChunk[] | undefined {
    if (!genAiChunks) return undefined;
    return genAiChunks.map(chunk => ({
        web: {
            uri: chunk.web?.uri || '',
            title: chunk.web?.title || ''
        }
    })).filter(c => c.web.uri);
}

const getLanguageName = (code: OutputLanguage) => SUPPORTED_LANGUAGES.find(l => l.code === code)?.name || code;

export async function generateDesignStyleGuideFromImage(
  imageBase64DataUri: string, 
  imageMimeType: string,
  userApiKey: string
): Promise<string> {
  if (!userApiKey) {
    throw new Error("API 키가 필요합니다. 오른쪽 상단에서 Gemini API 키를 입력해주세요.");
  }
  const ai = new GoogleGenAI({ apiKey: userApiKey });

  const pureBase64Data = imageBase64DataUri.split(',')[1];
  if (!pureBase64Data) {
      throw new Error("잘못된 이미지 데이터 URI 형식입니다. 순수 Base64 데이터를 추출할 수 없습니다.");
  }

  const imagePart: Part = {
    inlineData: {
      mimeType: imageMimeType,
      data: pureBase64Data,
    },
  };

  const textPrompt = `You are a design-forensics agent. An image has been provided to you. Analyze this image to extract up to 10 dominant colors via K-Means (or a similar color analysis method). Map these colors to UI roles (e.g., Primary Accent, Secondary Accent, Background, Text Color, etc.) based on common design heuristics or an implicit understanding of such. Then, build a Markdown style guide covering: Dominant Colors (with hex codes and roles), Typography (suggest font pairings or styles), Layout (general principles like spacing, alignment), Icons (suggest a style or family), and Motion (if applicable, suggest simple animation principles). Output *only* Markdown tables and headings — no prose explanations or introductory/concluding remarks. Do not reference Naver sources or any external websites in your output.`;
  
  const textPart: Part = {
    text: textPrompt,
  };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT, 
      contents: [{ role: "user", parts: [imagePart, textPart] }],
    });

    return response.text; 
  } catch (error) {
    console.error("디자인 스타일 가이드 생성 오류:", error);
    let errorMessage = "이미지에서 디자인 스타일 가이드 생성에 실패했습니다.";
    if (error instanceof Error) {
        errorMessage += ` ${error.message}`;
    } else {
        errorMessage += ` ${String(error)}`;
    }
    // Check for API key related common errors (though SDK might throw specific types)
    if (String(error).includes("API key not valid") || String(error).includes("API_KEY_INVALID")) {
        errorMessage = "Gemini API 키가 유효하지 않습니다. 올바른 API 키를 입력해주세요.";
    } else if (String(error).includes("Quota exceeded")) {
        errorMessage = "Gemini API 할당량이 초과되었습니다.";
    }
    throw new Error(errorMessage);
  }
}


export async function generatePresentationPlan(
  documentText: string,
  presentationTitle: string,
  language: OutputLanguage,
  numberOfSlides: number,
  userApiKey: string
): Promise<Omit<PresentationPlanItem, 'id' | 'slideNumber' | 'imageBase64' | 'imageMimeType'>[]> { 
  if (!userApiKey) {
    throw new Error("API 키가 필요합니다. 오른쪽 상단에서 Gemini API 키를 입력해주세요.");
  }
  const ai = new GoogleGenAI({ apiKey: userApiKey });
  const languageName = getLanguageName(language);

  const prompt = `
Context: You are an expert presentation planner.
Task: Analyze the provided 'Document Text' to create a structured presentation plan for a presentation titled "${presentationTitle}".
Output Language: ALL parts of your response, especially 'topic' and 'summary', MUST be in ${languageName}.
Number of Slides: The plan MUST consist of EXACTLY ${numberOfSlides} slides.

Input Document Text (analyzing up to ~8000 characters):
---
${documentText.substring(0, 8000)} ${documentText.length > 8000 ? '...' : ''}
---

Instructions:
1.  Deeply analyze the 'Document Text' to identify key themes, main arguments, supporting data, and conclusions.
2.  Based on this analysis, logically divide the content into ${numberOfSlides} distinct slides.
3.  For each slide in the plan, define:
    *   'topic': A concise and clear slide title in ${languageName}. This MUST be a double-quoted JSON string.
    *   'summary': A brief summary (2-4 sentences, in ${languageName}) of the core message, key content, data points, or visual ideas for that slide. This summary will guide the generation of actual slide content later. This ENTIRE summary MUST be a single, correctly double-quoted JSON string value.
    *   Images are NOT part of this planning stage. They will be added later by the user. Do not include any image references in the plan.

Output Format:
CRITICAL: Your response MUST be a single, valid JSON array. Each element of the array is an object representing a slide in the plan.
Each object MUST have exactly two keys: "topic" and "summary".
Both the keys (e.g., "topic") and their string values (e.g., "My Topic in ${languageName}") MUST be enclosed in double quotes.
There should be NO text, comments, or markdown formatting (like ${"```json"} or ${"```"}) outside the main JSON array structure.
Ensure that all string values, especially for "summary", are fully and correctly enclosed in double quotes. Do not break out of the string prematurely or add unquoted text within or between JSON elements.

Example for ${numberOfSlides} slides (ensure your output strictly follows this JSON structure, with content in ${languageName}):
[
  { "topic": "Slide 1 Topic in ${languageName}", "summary": "Slide 1 Summary in ${languageName}, ensuring this is a complete and valid string." },
  { "topic": "Slide 2 Topic in ${languageName}", "summary": "Slide 2 Summary in ${languageName}, also a complete and valid string." }
  // ... up to ${numberOfSlides} objects, each following the same strict format.
]

VERY IMPORTANT CHECKS FOR YOU TO MAKE BEFORE RESPONDING:
- The output MUST be *only* the JSON array. No introductory text, no explanations, no apologies, no markdown fences.
- All string values (for "topic" and "summary") must be properly enclosed in double quotes (").
- Commas (,) must be correctly placed:
    - Between objects in the array (e.g., { ... }, { ... }).
    - Between key-value pairs within an object (e.g., "topic": "...", "summary": "...").
- There should be NO trailing commas after the last element in an array or the last property in an object.
- Ensure NO unquoted text appears anywhere. The "summary" field, in particular, must be a single, complete, double-quoted string, without any text spilling outside its quotes before the comma or closing brace.
`;

  try {
    const genAIConfig: GenerateContentParameters['config'] = {
        responseMimeType: "application/json",
    };
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_TEXT,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: genAIConfig,
    });

    const jsonString = response.text;
    const parsedResult = parseAndCleanJsonString(jsonString);

    if (Array.isArray(parsedResult) && parsedResult.every(item => typeof item.topic === 'string' && typeof item.summary === 'string')) {
      if (parsedResult.length !== numberOfSlides) {
        console.warn(`LLM이 ${parsedResult.length}개의 계획 항목을 반환했으며, ${numberOfSlides}개가 예상되었습니다. 필요한 경우 슬라이스를 사용하거나 패딩합니다.`);
        let adjustedResult = [...parsedResult];
        if (adjustedResult.length > numberOfSlides) {
            adjustedResult = adjustedResult.slice(0, numberOfSlides);
        } else {
            while (adjustedResult.length < numberOfSlides) {
                adjustedResult.push({
                    topic: `Additional Slide Topic ${adjustedResult.length + 1} (${languageName})`, 
                    summary: `Summary for additional slide ${adjustedResult.length + 1} (${languageName}). Please ensure content is meaningful or edit as needed.`
                });
            }
        }
        return adjustedResult as Omit<PresentationPlanItem, 'id' | 'slideNumber' | 'imageBase64' | 'imageMimeType'>[];
      }
      return parsedResult as Omit<PresentationPlanItem, 'id' | 'slideNumber' | 'imageBase64' | 'imageMimeType'>[];
    } else {
      console.error("구문 분석된 계획 응답이 예상 형식이 아닙니다:", parsedResult);
      throw new Error(`LLM이 ${languageName}에 대한 프레젠테이션 계획을 예기치 않은 형식으로 반환했습니다.`);
    }
  } catch (error) {
    console.error("프레젠테이션 계획 생성 오류:", error);
    let errorMessage = `${languageName} 프레젠테이션 계획 생성에 실패했습니다.`;
     if (error instanceof Error) {
        errorMessage += ` ${error.message}`;
    } else {
        errorMessage += ` ${String(error)}`;
    }
    if (String(error).includes("API key not valid") || String(error).includes("API_KEY_INVALID")) {
        errorMessage = "Gemini API 키가 유효하지 않습니다. 올바른 API 키를 입력해주세요.";
    }
    throw new Error(errorMessage);
  }
}


export async function* generateIndividualSlideOutputsFromPlanItem(
  planItem: PresentationPlanItem, 
  fullPlanContext: PresentationPlanItem[], 
  documentText: string, 
  presentationTitle: string,
  language: OutputLanguage,
  designStyleGuideMd: string | null,
  userApiKey: string
): AsyncGenerator<Partial<GeneratedSlideOutput> & { planId: string, isComplete?: boolean, currentContentType?: 'html' | 'speech' | 'pptx' }, void, void> {
  if (!userApiKey) {
    throw new Error("API 키가 필요합니다. 오른쪽 상단에서 Gemini API 키를 입력해주세요.");
  }
  const ai = new GoogleGenAI({ apiKey: userApiKey });
  const languageName = getLanguageName(language);
  const planOverview = fullPlanContext.map(p => `${p.slideNumber}. ${p.topic}: ${p.summary.substring(0,100)}...`).join('\\n');

  let imageHandlingInstructions = "";
  if (planItem.imageBase64 && planItem.imageMimeType) {
      imageHandlingInstructions = `
*   **사용자 제공 이미지 활용 (중요!):**
    *   현재 슬라이드("${planItem.topic}")에 대해 사용자가 이미지를 제공했습니다 (MIME 타입: "${planItem.imageMimeType}").
    *   **이 이미지는 슬라이드의 주요 시각적 콘텐츠로 사용해야 합니다.** \`slideHtml\`에 \`<img>\` 태그를 사용하여 직접 삽입하십시오.
        *   **\`src\` 속성:** 프론트엔드에서 실제 이미지 데이터로 대체될 것이므로, 여기서는 **반드시 \`src="IMAGE_DATA_URI_PLACEHOLDER_FOR_SLIDE_ITEM"\`라는 고정된 문자열 플레이스홀더를 사용해야 합니다.**
        *   **\`alt\` 텍스트:** \`alt="슬라이드 ${planItem.slideNumber}의 콘텐츠 이미지: ${planItem.topic}"\` 과 같이 구체적이고 설명적인 alt 텍스트를 제공하십시오.
        *   **스타일링 (Tailwind CSS):** 이미지가 4:3 슬라이드 영역에 잘 맞고, 세로 스크롤을 유발하지 않도록 Tailwind CSS (예: \`max-w-full\`, \`max-h-[calc(100%-4rem)]\`, \`mx-auto\`, \`my-2\`, \`rounded-lg\`, \`object-contain\`)를 사용해 크기, 정렬, 여백을 조정하십시오. 예: \`<div class="my-auto flex justify-center items-center h-full"><img src="IMAGE_DATA_URI_PLACEHOLDER_FOR_SLIDE_ITEM" alt="${planItem.topic} 관련 이미지" class="max-w-full max-h-[90%] object-contain rounded shadow-lg"></div>\`
    *   **이미지와 텍스트 공존 (필수!):** 이미지가 존재하더라도, **반드시 해당 슬라이드의 주제("${planItem.topic}")와 요약("${planItem.summary}")을 보조하는 관련 텍스트 콘텐츠(제목, 핵심 포인트, 짧은 설명 등)도 함께 생성해야 합니다.** 텍스트는 이미지와 조화롭게 배치되어야 하며 가독성이 높아야 합니다. 이미지가 있다고 텍스트를 생략해서는 안 됩니다.
`;
  } else {
    imageHandlingInstructions = `
*   **사용자 제공 이미지:** 이 슬라이드에는 사용자가 직접 제공한 이미지가 없습니다. 제공된 텍스트 정보와 계획 요약을 기반으로 콘텐츠를 생성하십시오.
`;
  }

  const advancedContentInstructions = `
*   **고급 콘텐츠 요소 생성 (해당되는 경우):**
    슬라이드의 주제와 요약에 따라 다음 고급 콘텐츠 유형을 \`slideHtml\`에 통합할 수 있습니다. 정보를 가장 잘 전달할 수 있는 적절한 요소를 선택하십시오. 모든 요소가 한 슬라이드에 필요한 것은 아닙니다.

    1.  **수식 (MathJax - LaTeX):**
        *   복잡한 수학 공식이나 과학적 표기법이 필요한 경우, LaTeX 형식을 사용하여 수식을 작성하십시오. (예: 인라인 \`\\( E=mc^2 \\)\`, 디스플레이 \`$$ \\sum_{i=0}^n i = \\frac{n(n+1)}{2} $$\`).
        *   MathJax 라이브러리가 HTML 환경에서 로드되어 있다고 가정합니다.

    2.  **표 (HTML Table with Tailwind CSS):**
        *   데이터를 표 형식으로 표시해야 하는 경우, GFM Markdown 대신 직접 HTML \`<table>\` 구조를 생성하십시오.
        *   Tailwind CSS 클래스를 사용하여 스타일을 적용하십시오. 예: \`<table class="w-full my-2 text-sm border border-collapse border-gray-300 rounded-md shadow"><thead class="bg-gray-100"><tr class="text-left"><th class="border border-gray-300 p-2">헤더1</th><th class="border border-gray-300 p-2">헤더2</th></tr></thead><tbody><tr><td class="border border-gray-300 p-2">데이터1</td><td class="border border-gray-300 p-2">데이터2</td></tr></tbody></table>\`

    3.  **다이어그램 및 타임라인 (Mermaid.js):**
        *   프로세스 흐름, 계층 구조, 시퀀스 다이어그램, 간트 차트 또는 타임라인이 적절한 경우, Mermaid 구문을 사용하십시오.
        *   Mermaid 코드는 \`<div class="mermaid"> ... Mermaid 코드 ... </div>\` 블록 내에 배치되어야 합니다.
        *   예시 (플로우차트): \`<div class="mermaid">graph TD; A[시작] --> B{결정}; B -- Yes --> C[완료]; B -- No --> D[다른 경로];</div>\`
        *   예시 (타임라인): \`<div class="mermaid">timeline title 프로젝트 타임라인 섹션 1 : 작업1 : 작업2 : 2d 후 작업3 : 2d 후</div>\`
        *   Mermaid 라이브러리가 HTML 환경에서 로드되어 있다고 가정합니다.

    4.  **차트 (Chart.js - JSON 방식):**
        *   막대, 선, 파이 차트 등이 필요한 경우, Chart.js 구성을 위한 JSON 객체를 생성하십시오.
        *   이 JSON 객체는 \`<pre class="chart-json"><code> ... JSON 객체 ... </code></pre>\` 블록 내에 배치되어야 합니다.
        *   Chart.js 라이브러리가 HTML 환경에서 로드되어 있고, 프론트엔드 스크립트가 이 JSON을 사용하여 차트를 렌더링한다고 가정합니다.
        *   간단한 JSON 구조 예시:
            \`\`\`json
            {
              "type": "bar",
              "data": {
                "labels": ["항목 A", "항목 B"],
                "datasets": [{
                  "label": "데이터셋 1",
                  "data": [10, 20],
                  "backgroundColor": ["rgba(230,0,18,0.6)", "rgba(201,191,181,0.6)"],
                  "borderColor": ["#E60012", "#C9BFB5"],
                  "borderWidth": 1
                }]
              },
              "options": {
                "responsive": true,
                "maintainAspectRatio": false,
                "scales": { "y": { "beginAtZero": true } },
                "plugins": { "legend": { "display": true, "position": "top" } }
              }
            }
            \`\`\`
        *   \`slideHtml\`에는 차트를 표시할 컨테이너(예: \`<div class="w-full h-64 md:h-80 my-2"><canvas class="chart-canvas"></canvas></div>\`)와 그 뒤에 \`<pre class="chart-json"><code>...</code></pre>\`를 포함할 수 있습니다. 프론트엔드에서 \`.chart-canvas\`를 찾아 Chart.js를 초기화할 것입니다.

    5.  **코드 스니펫 (HTML pre/code):**
        *   코드 예시는 \`<pre class="rounded-md bg-gray-800 text-white p-3 overflow-x-auto text-xs"><code class="language-javascript"> ... 코드 ... </code></pre>\`와 같이 \`<pre>\`와 \`<code>\` 태그를 사용하고, 적절한 \`language-xyz\` 클래스를 지정하십시오. (예: \`language-python\`, \`language-html\`).
        *   코드는 HTML 인코딩(예: \`&lt;\` 대신 \`<\`) 없이 직접 작성합니다. 프론트엔드에서 적절히 표시됩니다.

    6.  **마인드맵 (Markmap):**
        *   계층적 아이디어나 마인드맵이 적절한 경우, Markmap 호환 마크다운을 사용하십시오.
        *   이 마크다운은 \`<div class="markmap" style="height: 300px;"> ... Markmap 마크다운 ... </div>\` 블록 내에 배치되어야 합니다. (필요에 따라 높이 조정)
        *   예시: \`<div class="markmap" style="height: 250px;"># 마인드맵 제목\\n## 주요 아이디어 1\\n- 하위 항목 A\\n- 하위 항목 B\\n## 주요 아이디어 2</div>\`
        *   Markmap 라이브러리가 HTML 환경에서 로드되어 있다고 가정합니다.
`;

  const systemPromptForSlideGen = `## 역할 프롬프트: 프레젠테이션 슬라이드 및 스크립트 생성 AI

**당신은 사용자가 제공하는 내용을 바탕으로 프레젠테이션 슬라이드와 그에 맞는 연설문을 생성하는 전문 AI 어시스턴트입니다.** 당신의 주요 임무는 시각적으로 매력적이고 정보 전달력이 높은 단일 슬라이드를 HTML 코드로 생성하고, 해당 슬라이드를 발표할 때 사용할 수 있는 자연스러운 연설문을 함께 작성하는 것입니다.

**제공된 정보:**
*   **프레젠테이션 제목:** "${presentationTitle}"
*   **현재 슬라이드 번호:** ${planItem.slideNumber}
*   **현재 슬라이드 주제 (계획 기반):** "${planItem.topic}"
*   **현재 슬라이드 요약 (계획 기반):** "${planItem.summary}"
${imageHandlingInstructions}
${advancedContentInstructions}
*   **전체 프레젠테이션 계획 (참고용):**
    ---
    ${planOverview}
    ---
*   **주요 문서 내용 (참고용, 현재 슬라이드 계획에 집중):**
    ---
    ${documentText.substring(0, 3000)} ${documentText.length > 3000 ? '...' : ''}
    ---
*   **디자인 스타일 가이드 (업로드된 주 이미지 분석 기반, 현재 슬라이드에 반드시 적용):**
    ---
    ${designStyleGuideMd || "업로드된 주 이미지에서 특정 디자인 스타일 가이드가 제공되지 않았습니다. 이 경우, 일반적인 디자인 원칙을 따르십시오."}
    ---
    **중요 지침:** 위에 "디자인 스타일 가이드"가 제공되었다면, **현재 생성 중인 슬라이드(${planItem.slideNumber}. ${planItem.topic})의 \`slideHtml\`을 디자인할 때 이 가이드의 권장 사항(색상, 타이포그래피, 레이아웃, 아이콘 등)을 최우선으로 일관되게 적용해야 합니다.** 이 스타일 가이드는 현재 슬라이드의 시각적 표현을 결정하는 핵심 요소입니다. 제공된 계획 항목의 세부 정보와 조화를 이루도록 적용하십시오. 만약 스타일 가이드가 없다면, 표준적이고 깔끔한 디자인을 적용해주십시오.
*   **출력 언어:** 모든 생성된 텍스트(제목, HTML 콘텐츠, 연설문, PPTX 마크다운)는 반드시 **${languageName}**로 작성되어야 합니다.

**핵심 기능:**

1.  **슬라이드 생성 (HTML - \`slideHtml\` 키):**
    *   **CRITICAL CONSTRAINT - 4:3 Aspect Ratio & NO VERTICAL OVERFLOW:**
        *   생성하는 HTML 콘텐츠는 **고정된 4:3 비율의 슬라이드 공간에 완벽하게 들어맞도록 디자인**되어야 합니다.
        *   **세로 스크롤이 절대로 발생해서는 안 됩니다.** 시각적 슬라이드(\`slideHtml\`)는 간결하고 핵심적인 내용만 포함해야 합니다.
        *   **자세한 설명이나 부가 정보는 \`speechMd\` (연설문)에서 충분히 다루도록 하고, \`slideHtml\`에는 최소한의 텍스트와 시각 요소만 배치합니다.**
    *   **텍스트 정규화 및 줄 간격:** HTML 요소에 텍스트 콘텐츠를 삽입하기 전에, OCR 과정이나 처리 중 발생할 수 있는 의도하지 않은 줄 바꿈 및 과도한 공백을 제거하여 내용을 정규화합니다. **가독성을 위해 편안하고 일관된 줄 간격(예: Tailwind CSS의 \`leading-relaxed\` 또는 \`leading-normal\`)을 사용합니다.** 문장, 목록 항목 등이 자연스럽게 이어지도록 처리해야 합니다.
    *   **Tailwind CSS, Font Awesome, Google Fonts (Noto Sans KR) 활용:** HTML 구조 내에 Tailwind CSS 유틸리티 클래스를 직접 사용하여 스타일을 적용합니다. Font Awesome 아이콘과 Noto Sans KR 글꼴을 사용합니다. **이러한 라이브러리는 HTML이 렌더링되는 환경에 이미 전역적으로 로드되어 있다고 가정합니다. 따라서 \`slideHtml\` 출력물에 직접 \`<link>\` 또는 \`<style>\` 태그를 포함하지 마십시오.** (예: \`<div class="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-100 font-[Noto Sans KR,sans-serif] leading-normal">\`)
    *   **Grid, Flexbox, Padding, Margin 유틸리티를 적극 사용하여 콘텐츠 구조를 잡고, 공백이나 긴 텍스트 줄로 인한 레이아웃 문제를 방지합니다.**
    *   **HTML 구조:** 생성하는 HTML은 **슬라이드 컨테이너의 직접적인 자식으로 삽입될 수 있는 본문 콘텐츠여야 합니다.** (예: \`<div><h1>실제 슬라이드 제목</h1>...</div>\`). \`<html>\`, \`<head>\`, \`<body>\` 태그를 포함하지 마십시오. 슬라이드의 제목은 이 HTML의 일부여야 하며, 일반적으로 \`<h1>\` 또는 \`<h2>\` 태그입니다.

2.  **연설문 생성 (Markdown - \`speechMd\` 키):**
    *   생성된 슬라이드의 내용을 명확하고 효과적으로 전달할 수 있는 연설문을 Markdown 형식으로 작성합니다. \`slideHtml\`에 담지 못한 상세 내용을 여기서 충분히 설명합니다.
    *   청중이 이해하기 쉽도록 전문적이면서도 자연스러운 어조를 사용합니다.
    *   슬라이드의 각 요소(제목, 핵심 내용, 이미지, 코드 예시, 차트, 다이어그램 등)를 순서대로 설명하며, 필요한 경우 부가적인 설명이나 전환 문구를 포함합니다.

3.  **PPTX용 마크다운 생성 (\`slideMarkdownForPptx\` 키):**
    *   PPTX 변환에 적합한 형태로 슬라이드 내용을 요약한 마크다운을 생성합니다.
    *   제목, 주요 항목, (만약 슬라이드에 이미지가 있다면) 이미지 설명 또는 플레이스홀더(\`![${planItem.topic} 관련 이미지](image_placeholder_for_pptx)\`), 차트/다이어그램에 대한 간략한 설명, 노트 등을 포함할 수 있습니다.

**출력 형식:**
정확히 다음 네 개의 문자열 키를 가진 단일 JSON 객체를 반환해야 합니다: "title", "slideHtml", "speechMd", "slideMarkdownForPptx".
**응답은 오직 JSON 객체여야 합니다. 추가 텍스트나 마크다운 래퍼가 없어야 합니다.**

JSON 출력 예시 (${languageName} 기준, **4:3 비율에 맞는 간결한 HTML 강조**):
{
  "title": "슬라이드 제목 (${languageName})",
  "slideHtml": "<div class=\\"w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 bg-white font-[Noto Sans KR,sans-serif] text-gray-800 leading-normal\\"><h1 class=\\"text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-center text-red-700\\">슬라이드 제목 <i class=\\"fas fa-chart-line ml-1\\"></i></h1><p class=\\"text-sm sm:text-base text-center mb-2\\">이미지가 있다면 여기에 이미지가 표시되고, 텍스트가 이미지를 보완합니다.</p><div class=\\"w-full h-48 my-2 border border-gray-300 flex items-center justify-center text-gray-500\\">여기에 차트/다이어그램/테이블 또는 기타 콘텐츠가 올 수 있습니다.</div><ul class=\\"list-disc list-inside text-sm text-left max-w-md mx-auto\\"><li>핵심 요점 1</li><li>핵심 요점 2</li></ul></div>",
  "speechMd": "### 슬라이드 ${planItem.slideNumber} 연설문: 슬라이드 제목\\n\\n안녕하십니까. 이번 슬라이드에서는 [슬라이드 제목]에 대해 말씀드리겠습니다.\\n이 슬라이드는 [이미지 또는 주요 시각적 요소 설명]을 보여줍니다. 핵심 메시지는 [핵심 메시지]입니다. 주요 포인트는 다음과 같습니다: 첫째, [핵심 요점 1 설명]... 둘째, [핵심 요점 2 설명]...\\n(차트/다이어그램이 있다면: 이 [차트/다이어그램]은 [데이터/프로세스]를 명확히 보여줍니다...)",
  "slideMarkdownForPptx": "# 슬라이드 제목\\n\\n- 핵심 요점 1\\n- 핵심 요점 2\\n\\n(이미지: ${planItem.topic} 관련 이미지)\\n(차트: [차트 종류] - [주요 내용 요약])\\n\\n> [!NOTE] PPTX용 추가 노트입니다."
}`;

  try {
    const genAIConfig: GenerateContentParameters['config'] = {
        responseMimeType: "application/json",
    };

    const requestParts: Part[] = [{ text: systemPromptForSlideGen }];

    const responseStream = await ai.models.generateContentStream({ 
        model: GEMINI_MODEL_TEXT,
        contents: [{ role: "user", parts: requestParts }],
        config: genAIConfig,
    });
    
    let accumulatedJson = "";
    for await (const chunk of responseStream) {
        const chunkText = chunk.text; 
        accumulatedJson += (chunkText || ''); 
        yield { planId: planItem.id, title: planItem.topic }; 
    }

    const parsed = parseAndCleanJsonString(accumulatedJson);

    if (parsed && typeof parsed.title === 'string' && typeof parsed.slideHtml === 'string' && typeof parsed.speechMd === 'string' && typeof parsed.slideMarkdownForPptx === 'string') {
        yield {
            planId: planItem.id,
            slideNumber: planItem.slideNumber,
            title: parsed.title,
            slideHtml: parsed.slideHtml,
            speechMd: parsed.speechMd,
            slideMarkdownForPptx: parsed.slideMarkdownForPptx,
            isComplete: true
        };
    } else {
        console.error("구문 분석된 개별 슬라이드 출력이 예상 형식이 아닙니다:", parsed);
        throw new Error(`LLM이 "${planItem.topic}" 주제(${languageName})에 대한 개별 슬라이드 콘텐츠를 예기치 않은 형식으로 반환했습니다. 출력: ${JSON.stringify(parsed).substring(0,300)}`);
    }

  } catch (error) {
    console.error(`"${planItem.topic}" 슬라이드 콘텐츠 생성 오류:`, error);
    let errorMsg = error instanceof Error ? error.message : String(error);
    if (String(error).includes("API key not valid") || String(error).includes("API_KEY_INVALID")) {
        errorMsg = "Gemini API 키가 유효하지 않습니다. 환경 변수를 확인해주세요. (" + errorMsg + ")";
    }

    yield {
        planId: planItem.id,
        title: planItem.topic,
        slideHtml: `<div class='p-4 text-red-600 font-[Noto Sans KR,sans-serif]'><h1><i class="fas fa-exclamation-triangle mr-2"></i>슬라이드 생성 오류</h1><p>"${planItem.topic}" (${languageName})에 대한 HTML 콘텐츠를 생성할 수 없습니다.</p><p class="text-sm">${errorMsg}</p></div>`,
        speechMd: `### 오류\n"${planItem.topic}" (${languageName})에 대한 연설문을 생성할 수 없습니다.\n${errorMsg}`,
        slideMarkdownForPptx: `# 오류: ${planItem.topic}\n이 슬라이드에 대한 마크다운 콘텐츠를 생성할 수 없습니다 (${languageName}).\n${errorMsg}`,
        isComplete: true
    };
  }
}

export async function generateOutlineFromText(
  // userApiKey parameter removed
  documentText: string,
  presentationTitle: string,
  language: OutputLanguage
): Promise<Pick<OutlineItem, 'topic'>[]> {
  console.warn("generateOutlineFromText 함수가 호출되었습니다 - 이 함수는 새 흐름에서 generatePresentationPlan으로 대체되어야 합니다.");
  // userApiKey no longer passed to generatePresentationPlan
  const planItems = await generatePresentationPlan(documentText, presentationTitle, language, 3); 
  return planItems.map(item => ({ topic: item.topic }));
}
