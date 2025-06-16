
import { OutlineItem, PresentationPlanItem } from './types'; // Added PresentationPlanItem

// PRESET_OUTLINES might be re-evaluated. For now, it's not directly used by the new plan-based generation.
// If we want preset "plans", this structure would need to change to fit PresentationPlanItem.
export const PRESET_OUTLINES: { [key: string]: OutlineItem[] } = {
  GENERAL_PRESENTATION: [
    { id: 'preset-1', topic: 'Introduction', include: true },
    { id: 'preset-2', topic: 'Problem Statement', include: true },
    { id: 'preset-3', topic: 'Proposed Solution', include: true },
    { id: 'preset-4', topic: 'Key Features/Benefits', include: true },
    { id: 'preset-5', topic: 'Call to Action / Next Steps', include: true },
    { id: 'preset-6', topic: 'Q&A', include: true },
  ],
  REPORT_SUMMARY: [
    { id: 'report-1', topic: 'Executive Summary', include: true },
    { id: 'report-2', topic: 'Background', include: true },
    { id: 'report-3', topic: 'Key Findings', include: true },
    { id: 'report-4', topic: 'Analysis', include: true },
    { id: 'report-5', topic: 'Recommendations', include: true },
    { id: 'report-6', topic: 'Conclusion', include: true },
  ],
  PROJECT_UPDATE: [
    { id: 'project-1', topic: 'Project Overview & Goals', include: true },
    { id: 'project-2', topic: 'Progress Since Last Update', include: true },
    { id: 'project-3', topic: 'Challenges Encountered', include: true },
    { id: 'project-4', topic: 'Upcoming Milestones', include: true },
    { id: 'project-5', topic: 'Resource Allocation', include: true },
  ],
};

export const DEFAULT_NUMBER_OF_SLIDES_IN_PLAN: number = 3; // Default for plan generation

export const GEMINI_MODEL_TEXT: string = 'gemini-2.5-flash-preview-04-17';