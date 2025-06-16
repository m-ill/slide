# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
S-Slide is an AI-powered presentation generator built with React, TypeScript, and Vite that uses Google's Gemini API to create presentations from uploaded documents or images.

## Development Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Architecture
The application follows a multi-step workflow pattern with four main steps:
1. **UPLOAD_CONFIG**: Users upload documents/images and configure presentation settings
2. **PLAN_DEFINITION**: Define presentation structure and language preferences
3. **GENERATING_CONTENT**: AI generates slide content using Google Gemini
4. **PREVIEW_PRESENTATION**: Preview and export the final presentation

Key architectural decisions:
- State management through React hooks in App.tsx
- All AI interactions centralized in services/geminiService.ts
- Components follow a functional pattern with TypeScript interfaces
- Slide rendering uses a 4:3 aspect ratio with responsive scaling

## Google Gemini Integration
- **Model**: Use `gemini-2.5-flash-preview-05-20` (not the older version in code)
- **SDK**: @google/genai package
- **API Key**: Loaded from `GEMINI_API_KEY` environment variable in .env.local
- Service functions handle plan generation, content generation, and style guide extraction

## Content Rendering
- **Mathematical expressions**: MathJax v3 for LaTeX rendering
- **Diagrams**: Mermaid.js for flowcharts and diagrams
- **Charts**: Chart.js for data visualization
- **Mind maps**: Markmap for hierarchical visualization
- **Markdown**: react-markdown with remark-gfm for content formatting

## Important Implementation Notes
- Slide preview maintains 4:3 aspect ratio using CSS transforms
- Export functionality generates standalone HTML with all dependencies inlined
- Multi-language support for Korean, English, Chinese, and Japanese
- Style guide can be extracted from uploaded images for consistent theming