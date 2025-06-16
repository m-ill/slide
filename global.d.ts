
// This file can be used to declare global types or augment existing ones.
// For example, if you attach custom properties to the window object:

interface Window {
  renderDynamicContent?: () => void;
  MathJax?: {
    typeset?: (elements?: any[]) => void;
    startup?: {
      promise: Promise<any>;
      defaultReady: () => void;
      // Add other MathJax properties/methods if needed
    };
  };
  mermaid?: {
    initialize: (config: any) => void;
    render: (id: string, txt: string, cbOrElement?: ((svgCode: string, bindFunctions?: (element: Element) => void) => void) | Element, container?: Element) => string;
    // Add other Mermaid properties/methods if needed
  };
  Chart?: any; // Consider more specific types if available from @types/chart.js if you were to install it
  markmap?: {
    Markmap: any; // Constructor for Markmap
    transformer: any; // Transformer for Markmap
    // Add other Markmap properties/methods if needed
  };
  DOMPurify?: {
    sanitize: (input: string, config?: any) => string;
    // Add other DOMPurify methods if needed
  };
}
