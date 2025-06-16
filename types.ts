
export interface PresentationPlanItem {
  id: string; // Unique ID for the plan item
  slideNumber: number;
  topic: string;
  summary: string; // Summary of content for this slide from the plan
  imageBase64?: string | null; // Optional base64 encoded image string for this specific slide
  imageMimeType?: string | null; // Optional MIME type for the image
}

export interface GeneratedSlideOutput {
  planId: string; // Links back to PresentationPlanItem.id
  slideNumber: number;
  title: string; // Actual title generated for the slide
  slideHtml: string; // HTML content for impress.js slide body
  speechMd: string; // Markdown for speech notes
  slideMarkdownForPptx: string; // Markdown for PPTX conversion
  groundingChunks?: GroundingChunk[]; // Existing grounding chunks
  itemImageBase64?: string | null; // Base64 data URI of the image for this slide item
  itemImageMimeType?: string | null; // Mime type of the image for this slide item
}

// Old Slide / SlideWithGrounding might be deprecated or used internally by PPTX export
export interface Slide {
  id: string;
  title: string;
  content: string; // Markdown content
}
export interface SlideWithGrounding extends Slide {
  groundingChunks?: GroundingChunk[];
}


export enum AppStep {
  UPLOAD_CONFIG = 'UPLOAD_CONFIG',
  PLAN_DEFINITION = 'PLAN_DEFINITION', // Replaces OUTLINE_EDIT
  GENERATING_CONTENT = 'GENERATING_CONTENT', // Was GENERATING
  PREVIEW_PRESENTATION = 'PREVIEW_PRESENTATION', // Was PREVIEW
}

// Represents a chunk of a grounding citation
export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web: GroundingChunkWeb;
}

export type OutputLanguage = 'ko' | 'en' | 'zh' | 'ja';

export const SUPPORTED_LANGUAGES: { code: OutputLanguage; name: string }[] = [
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'ja', name: 'Japanese (日本語)' },
];

// Existing OutlineItem might be phased out or used only for preset loading if that feature is kept.
export interface OutlineItem {
  id:string;
  topic: string;
  customPrompt?: string; 
  include: boolean;
}