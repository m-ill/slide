import React from 'react';
import { GeneratedSlideOutput } from '../types';
import { DownloadIcon } from './Icons';

interface HtmlExportButtonProps {
  slides: GeneratedSlideOutput[];
  presentationTitle: string;
}

const HtmlExportButton: React.FC<HtmlExportButtonProps> = ({ slides, presentationTitle }) => {
  const generateFullHtml = () => {
    const slideHtmlContents = slides.map((slide, index) => {
      let finalSlideHtml = slide.slideHtml;
      if (slide.itemImageBase64 && finalSlideHtml.includes('IMAGE_DATA_URI_PLACEHOLDER_FOR_SLIDE_ITEM')) {
        finalSlideHtml = finalSlideHtml.replace(
          /IMAGE_DATA_URI_PLACEHOLDER_FOR_SLIDE_ITEM/g,
          slide.itemImageBase64
        );
      } else if (finalSlideHtml.includes('IMAGE_DATA_URI_PLACEHOLDER_FOR_SLIDE_ITEM')) {
        console.warn(`HTML Export: Slide ${index + 1} (${slide.title}) has an image placeholder but no image data.`);
      }

      const cleanedSpeechMd = slide.speechMd.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");

      return `
      <div id="slide-${index}" class="slide-container" style="${index === 0 ? 'display: block;' : 'display: none;'} width:100%; height:auto;">
        <div class="slide-preview-container-4-3">
          <div class="slide-preview-content-4-3 bg-white">
            ${finalSlideHtml}
          </div>
        </div>
        <div class="notes-container">
          <h3 style="color: #E60012;">연설문 (슬라이드 ${index + 1}: ${slide.title})</h3>
          <pre>${cleanedSpeechMd}</pre>
        </div>
      </div>
    `;
    }).join(''); // Removed '\\n' from join

    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${presentationTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Noto Sans KR', sans-serif;
      background-color: #F3E9DD; /* Page Background */
      color: #333333; /* Body Text */
      margin: 0;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    #presentation-fullscreen-wrapper { 
      width: 100%;
      max-width: 860px; /* This is our reference base width for scaling calculations */
    }
    .presentation-title {
      font-size: 2em;
      font-weight: bold;
      color: #E60012;
      margin-bottom: 10px;
      border-bottom: 2px solid #E60012;
      padding-bottom: 5px;
      text-align: center;
    }
    .slide-container { 
        width:100%; 
        height:auto; 
    }
    .slide-preview-container-4-3 {
      width: 100%;
      margin-left: auto;
      margin-right: auto;
      background-color: #333333;
      border: 1px solid #555555;
      border-radius: 0.375rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      padding-top: 75%; /* 4:3 Aspect Ratio */
      position: relative;
      overflow: hidden;
    }
    .slide-preview-content-4-3 { /* This is the element that will be scaled */
      position: absolute;
      top: 0;
      left: 0;
      width: 100%; /* Takes full width of its parent .slide-preview-container-4-3 */
      height: 100%;/* Takes full height of its parent .slide-preview-container-4-3 */
      transform-origin: center center; /* Default for normal view, will be set by JS for fullscreen */
      color: #333333;
      /* background-color should be set by the content within (e.g., AI generated div with bg-white) */
    }
    .slide-preview-content-4-3 strong { color: #000000; }
    .slide-preview-content-4-3 a { color: #E60012; }

    .navigation-controls {
      margin-top: 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
    }
    .navigation-controls button {
      padding: 8px 16px;
      background-color: #E60012;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.9em;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .navigation-controls button i { /* For Font Awesome icons in buttons */
        margin-right: 0; /* Reset if only icon */
    }
    .navigation-controls button:hover {
      background-color: #B8000F;
    }
    .navigation-controls button:disabled {
      background-color: #C9BFB5;
      color: #777777;
      cursor: not-allowed;
    }
    .slide-counter {
      font-size: 0.9em;
      color: #555555;
      min-width: 100px;
      text-align: center;
    }
    .notes-container {
        width: 100%;
        margin: 20px auto 0 auto;
        padding: 15px;
        background-color: #FAF6F0;
        border: 1px solid #E0D8CD;
        border-radius: 0.375rem;
        font-size: 0.9em;
        color: #333333;
    }
    .notes-container h3 {
        font-size: 1.1em;
        font-weight: bold;
        margin-bottom: 8px;
    }
    .notes-container pre {
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: 'Noto Sans KR', sans-serif;
        color: #333333;
    }
    .mermaid svg, .markmap svg {
        max-width: 100%;
        height: auto;
    }
    .chart-canvas-container {
        position: relative;
        width: 95%;
        height: 90%;
        margin: auto;
    }

    /* Fullscreen Wrapper Styles */
    #presentation-fullscreen-wrapper:fullscreen,
    #presentation-fullscreen-wrapper:-webkit-full-screen,
    #presentation-fullscreen-wrapper:-moz-full-screen,
    #presentation-fullscreen-wrapper:-ms-fullscreen {
        display: flex !important;
        flex-direction: column !important; /* Ensured important */
        /* align-items is now controlled by JS for horizontal alignment */
        /* justify-content is now controlled by JS for vertical alignment (fixed to center) */
        width: 100vw !important;
        height: 100vh !important;
        background-color: black !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: hidden !important;
    }

    /* Active .slide-container within fullscreen wrapper */
    #presentation-fullscreen-wrapper:fullscreen .slide-container {
        width: calc(min(98vw, (98vh * 4 / 3))) !important; 
        height: calc(min(98vh, (98vw * 3 / 4))) !important;
        background-color: black !important; /* Or transparent if wrapper is black */
        border: none !important;
        box-shadow: none !important;
        position: relative !important; 
        overflow: hidden !important; 
        margin: 0 !important; 
    }
    
    #presentation-fullscreen-wrapper:fullscreen .slide-container .slide-preview-container-4-3 {
        width: 100% !important; 
        height: 100% !important;
        padding-top: 0 !important; 
        position: relative !important; 
        top: 0 !important;
        left: 0 !important;
        background-color: transparent !important; 
        border: none !important;
        box-shadow: none !important;
    }
    
    /* Ensure .presentation-title is hidden in normal and fullscreen view in exported file */
    .presentation-title {
        display: none !important;
    }

    #presentation-fullscreen-wrapper:fullscreen .slide-container .notes-container {
        display: none !important;
    }

    /* Navigation controls in fullscreen */
    body.body-in-presentation-fullscreen-mode .navigation-controls {
        position: fixed;
        bottom: 20px;
        left: 50%; 
        transform: translateX(-50%); 
        z-index: 10000;
        background-color: rgba(30, 30, 30, 0.85); 
        padding: 10px 15px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        transition: opacity 0.3s ease-in-out;
    }
    body.body-in-presentation-fullscreen-mode .navigation-controls button {
        background-color: rgba(230, 0, 18, 0.7);
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
        min-width: 36px; 
    }
    body.body-in-presentation-fullscreen-mode .navigation-controls button:hover {
        background-color: rgba(184, 0, 15, 0.9);
    }
    body.body-in-presentation-fullscreen-mode .navigation-controls button:disabled {
        background-color: rgba(100, 100, 100, 0.5);
        color: rgba(200, 200, 200, 0.7);
        border-color: rgba(150,150,150,0.3);
    }
    body.body-in-presentation-fullscreen-mode .slide-counter {
        color: white;
    }
    
    /* Fullscreen Clickable Arrows */
    .fullscreen-nav-arrow {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10001; 
      background-color: rgba(40, 40, 40, 0.5);
      color: white;
      padding: 10px;
      border-radius: 50%;
      cursor: pointer;
      transition: background-color 0.2s ease-in-out, opacity 0.3s ease-in-out;
      display: none; 
      align-items: center;
      justify-content: center;
      width: 50px;
      height: 50px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .fullscreen-nav-arrow svg { width: 36px; height: 36px; fill: currentColor; }
    .fullscreen-nav-arrow:hover { background-color: rgba(60, 60, 60, 0.8); }
    .fullscreen-nav-arrow.prev-arrow { left: 20px; }
    .fullscreen-nav-arrow.next-arrow { right: 20px; }
    .fullscreen-nav-arrow.disabled-arrow { opacity: 0.3 !important; cursor: not-allowed; background-color: rgba(40, 40, 40, 0.3) !important; }
    body.body-in-presentation-fullscreen-mode .fullscreen-nav-arrow { display: flex !important; }
    
    .controls-autohide { opacity: 0 !important; pointer-events: none !important; }

    /* Styles for new fullscreen-specific controls */
    #fullscreenSpecificControls { display: none; align-items: center; gap: 8px; margin-left: 15px; }
    body.body-in-presentation-fullscreen-mode .navigation-controls #fullscreenSpecificControls { display: flex !important; }
    body.body-in-presentation-fullscreen-mode .navigation-controls .fs-controls-text { color: white; }
    body.body-in-presentation-fullscreen-mode .navigation-controls #fullscreenSpecificControls button.active-align-btn {
        background-color: #B8000F !important; 
        border: 1px solid #FF8C8C !important;
        box-shadow: inset 0 0 5px rgba(0,0,0,0.3);
    }
     body.body-in-presentation-fullscreen-mode .navigation-controls #fullscreenSpecificControls button {
        padding: 6px 10px; 
        font-size: 0.8em;
     }
     body.body-in-presentation-fullscreen-mode .navigation-controls #fullscreenSpecificControls span {
        font-size: 0.8em;
     }

  </style>
</head>
<body>
  <div id="presentation-fullscreen-wrapper">
    <!-- The presentation title h1 tag is removed based on user request -->
    
    <div id="fullscreenPrevArrow" class="fullscreen-nav-arrow prev-arrow">
      <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path></svg>
    </div>
    <div id="fullscreenNextArrow" class="fullscreen-nav-arrow next-arrow">
      <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path></svg>
    </div>

    ${slideHtmlContents}

    <div class="navigation-controls">
      <button id="prevBtn">&larr; 이전</button>
      <span id="slideCounter" class="slide-counter">슬라이드 1 / ${slides.length}</span>
      <button id="nextBtn">다음 &rarr;</button>
      <button id="fullscreenBtn">전체 화면</button>
      
      <div id="fullscreenSpecificControls">
        <button id="alignLeftBtnFs" title="왼쪽 정렬"><i class="fas fa-align-left"></i></button>
        <button id="alignCenterBtnFs" title="가운데 정렬"><i class="fas fa-align-center"></i></button>
        <button id="alignRightBtnFs" title="오른쪽 정렬"><i class="fas fa-align-right"></i></button>
        <span style="margin-left:10px;" class="fs-controls-text">배율:</span>
        <button id="scaleDownBtnFs" title="축소">-</button>
        <span id="scaleFactorDisplayFs" class="fs-controls-text" style="min-width: 35px; text-align: center;">1.0x</span>
        <button id="scaleUpBtnFs" title="확대">+</button>
      </div>
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js" id="MathJax-script" async></script>
  <script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-lib@latest/dist/browser/index.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-view@latest/dist/browser/index.min.js"></script>

  <script>
    if (typeof MathJax === 'undefined') {
      MathJax = {
        tex: { inlineMath: [['\\\\(', '\\\\)']], displayMath: [['$$', '$$']], processEscapes: true },
        svg: { fontCache: 'global' },
        startup: {
          ready: () => {
            MathJax.startup.defaultReady();
            MathJax.startup.promise.then(() => {
              console.log('MathJax PAI 초기화 완료 (Exported HTML)');
              renderDynamicContentForExport(document.getElementById(\`slide-0\`));
            });
          }
        }
      };
    } else if (MathJax.startup && MathJax.startup.promise) {
        MathJax.startup.promise.then(() => renderDynamicContentForExport(document.getElementById(\`slide-0\`)));
    }

    var mermaidAPIInitialized = false;
    function renderDynamicContentForExport(activeSlideElement) {
      if (!activeSlideElement) return;
      if (window.MathJax && window.MathJax.typeset) { try { window.MathJax.typeset(); } catch (e) { console.error('MathJax error:', e); }}
      if (window.mermaid) {
        try {
          if (!mermaidAPIInitialized) { mermaid.initialize({ startOnLoad: false, theme: 'neutral' }); mermaidAPIInitialized = true; }
          const mermaidElements = activeSlideElement.querySelectorAll('div.mermaid:not([data-processed="true"])');
          mermaidElements.forEach((el, i) => {
            const uniqueId = 'mermaid-export-' + Date.now() + '-' + i; const mermaidCode = el.textContent ? el.textContent.trim() : '';
            if (mermaidCode) { try { if (!el.querySelector('svg') || el.getAttribute('data-mermaid-code') !== mermaidCode) { el.innerHTML = ''; el.setAttribute('data-mermaid-code', mermaidCode); mermaid.render(uniqueId, mermaidCode, (svgCode) => { el.innerHTML = svgCode; }); } el.setAttribute('data-processed', 'true'); } catch (e) { console.error('Mermaid render error:', e, mermaidCode); el.setAttribute('data-processed', 'true');} } else {el.setAttribute('data-processed', 'true');} });
        } catch (e) { console.error('Mermaid processing error:', e); }
      }
      if (window.Chart) {
        const chartElements = activeSlideElement.querySelectorAll('pre.chart-json:not([data-chart-processed="true"])');
        chartElements.forEach((preElement) => {
          const codeElement = preElement.querySelector('code');
          if (codeElement && codeElement.textContent) { try { const chartConfig = JSON.parse(codeElement.textContent); let canvasContainer = preElement.parentElement.querySelector('.chart-canvas-container'); let canvasElement = canvasContainer ? canvasContainer.querySelector('canvas.chart-canvas') : null; if (!canvasElement) { canvasContainer = document.createElement('div'); canvasContainer.className = 'chart-canvas-container'; canvasElement = document.createElement('canvas'); canvasElement.className = 'chart-canvas'; canvasContainer.appendChild(canvasElement); preElement.parentNode.insertBefore(canvasContainer, preElement); } if (canvasElement && canvasElement.tagName === 'CANVAS') { if(Chart.getChart(canvasElement)){ Chart.getChart(canvasElement).destroy(); } new Chart(canvasElement, chartConfig); preElement.setAttribute('data-chart-processed', 'true'); preElement.style.display = 'none'; } } catch (e) { console.error('Chart.js error:', e); preElement.setAttribute('data-chart-processed', 'true'); } } else {preElement.setAttribute('data-chart-processed', 'true');} });
      }
      if (window.markmap && window.markmap.Markmap && window.markmap.transformer && window.d3) {
        const { Markmap, transformer } = window.markmap;
        const markmapElements = activeSlideElement.querySelectorAll('div.markmap:not([data-processed="true"])');
        markmapElements.forEach((el) => {
          const markdown = el.textContent || ''; if (markdown.trim()) { try { if (!el.querySelector('svg') || el.getAttribute('data-markmap-code') !== markdown) { const { root } = transformer.transform(markdown); el.innerHTML = ''; el.setAttribute('data-markmap-code', markdown); const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); el.appendChild(svgEl); Markmap.create(svgEl, null, root); } el.setAttribute('data-processed', 'true'); } catch (e) { console.error('Markmap error:', e); el.setAttribute('data-processed', 'true');} } else {el.setAttribute('data-processed', 'true');} });
      }
    }
    setTimeout(() => renderDynamicContentForExport(document.getElementById('slide-0')), 150);

    let currentSlide = 0;
    const totalSlides = ${slides.length};
    const slideElements = document.querySelectorAll('.slide-container');
    const prevButton = document.getElementById('prevBtn');
    const nextButton = document.getElementById('nextBtn');
    const fullscreenButton = document.getElementById('fullscreenBtn');
    const slideCounterElement = document.getElementById('slideCounter');
    const fullscreenPrevArrowEl = document.getElementById('fullscreenPrevArrow');
    const fullscreenNextArrowEl = document.getElementById('fullscreenNextArrow');
    const navigationControlsElement = document.querySelector('.navigation-controls');
    const fullscreenWrapperElement = document.getElementById('presentation-fullscreen-wrapper');
    
    let userScaleFactor = 1.0;
    let currentHorizontalAlignment = 'center'; // 'flex-start', 'center', 'flex-end'
    const scaleFactorDisplayFsElement = document.getElementById('scaleFactorDisplayFs');
    const alignLeftBtnFs = document.getElementById('alignLeftBtnFs');
    const alignCenterBtnFs = document.getElementById('alignCenterBtnFs');
    const alignRightBtnFs = document.getElementById('alignRightBtnFs');
    const scaleUpBtnFs = document.getElementById('scaleUpBtnFs');
    const scaleDownBtnFs = document.getElementById('scaleDownBtnFs');

    let controlsHideTimeout = null;
    const activityEvents = ['mousemove', 'mousedown', 'touchstart', 'keydown'];

    function hideFullscreenControls() {
      if (navigationControlsElement) navigationControlsElement.classList.add('controls-autohide');
      if (fullscreenPrevArrowEl) fullscreenPrevArrowEl.classList.add('controls-autohide');
      if (fullscreenNextArrowEl) fullscreenNextArrowEl.classList.add('controls-autohide');
    }

    function showAndResetFullscreenControlsTimer() {
      if (navigationControlsElement) navigationControlsElement.classList.remove('controls-autohide');
      if (fullscreenPrevArrowEl) fullscreenPrevArrowEl.classList.remove('controls-autohide');
      if (fullscreenNextArrowEl) fullscreenNextArrowEl.classList.remove('controls-autohide');
      
      clearTimeout(controlsHideTimeout);
      if (document.body.classList.contains('body-in-presentation-fullscreen-mode')) {
         controlsHideTimeout = setTimeout(hideFullscreenControls, 3000);
      }
    }

    function setupFullscreenActivityListeners() { activityEvents.forEach(event => { document.addEventListener(event, showAndResetFullscreenControlsTimer); }); }
    function removeFullscreenActivityListeners() { activityEvents.forEach(event => { document.removeEventListener(event, showAndResetFullscreenControlsTimer); }); clearTimeout(controlsHideTimeout); }

    function updateFullscreenStyles() {
        if (!document.body.classList.contains('body-in-presentation-fullscreen-mode')) return;

        const activeSlideContainerInFs = fullscreenWrapperElement.querySelector('.slide-container[style*="display: block"]');
        if (!activeSlideContainerInFs) return;
        
        const slideContentToScale = activeSlideContainerInFs.querySelector('.slide-preview-content-4-3');
        if (!slideContentToScale) return;
        
        // Control horizontal alignment of the .slide-container within the flex wrapper
        fullscreenWrapperElement.style.alignItems = currentHorizontalAlignment;
        // Consistently center the .slide-container vertically
        fullscreenWrapperElement.style.justifyContent = 'center'; 

        // Scaling for the content of the active slide
        slideContentToScale.style.transformOrigin = 'center center';
        slideContentToScale.style.transform = \`scale(\${userScaleFactor})\`;
        
        if (scaleFactorDisplayFsElement) {
            scaleFactorDisplayFsElement.textContent = \`\${userScaleFactor.toFixed(1)}x\`;
        }

        // Update active state for alignment buttons
        if (alignLeftBtnFs) alignLeftBtnFs.classList.toggle('active-align-btn', currentHorizontalAlignment === 'flex-start');
        if (alignCenterBtnFs) alignCenterBtnFs.classList.toggle('active-align-btn', currentHorizontalAlignment === 'center');
        if (alignRightBtnFs) alignRightBtnFs.classList.toggle('active-align-btn', currentHorizontalAlignment === 'flex-end');
    }


    function showSlide(index) {
      slideElements.forEach((slide, i) => { slide.style.display = i === index ? 'block' : 'none'; });
      slideCounterElement.textContent = \`슬라이드 \${index + 1} / \${totalSlides}\`;
      prevButton.disabled = index === 0;
      nextButton.disabled = index === totalSlides - 1;
      if (fullscreenPrevArrowEl) { fullscreenPrevArrowEl.classList.toggle('disabled-arrow', index === 0); }
      if (fullscreenNextArrowEl) { fullscreenNextArrowEl.classList.toggle('disabled-arrow', index === totalSlides - 1); }
      
      const activeSlideContainer = slideElements[index];
      if (activeSlideContainer) {
        activeSlideContainer.querySelectorAll('[data-processed="true"]').forEach(el => el.removeAttribute('data-processed'));
        activeSlideContainer.querySelectorAll('[data-chart-processed="true"]').forEach(el => el.removeAttribute('data-chart-processed'));
        activeSlideContainer.querySelectorAll('[data-markmap-code]').forEach(el => el.removeAttribute('data-markmap-code'));
        activeSlideContainer.querySelectorAll('[data-mermaid-code]').forEach(el => el.removeAttribute('data-mermaid-code'));
        renderDynamicContentForExport(activeSlideContainer);
      }
      if (document.body.classList.contains('body-in-presentation-fullscreen-mode')) {
        setTimeout(updateFullscreenStyles, 0); 
      }
    }

    prevButton.addEventListener('click', () => { if (currentSlide > 0) { currentSlide--; showSlide(currentSlide); } });
    nextButton.addEventListener('click', () => { if (currentSlide < totalSlides - 1) { currentSlide++; showSlide(currentSlide); } });
    if (fullscreenPrevArrowEl) { fullscreenPrevArrowEl.addEventListener('click', () => { if (currentSlide > 0) prevButton.click(); }); }
    if (fullscreenNextArrowEl) { fullscreenNextArrowEl.addEventListener('click', () => { if (currentSlide < totalSlides - 1) nextButton.click(); }); }

    fullscreenButton.addEventListener('click', toggleFullscreen);

    function toggleFullscreen() {
      if (!fullscreenWrapperElement) return;
      if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
        if (fullscreenWrapperElement.requestFullscreen) fullscreenWrapperElement.requestFullscreen();
        else if (fullscreenWrapperElement.webkitRequestFullscreen) fullscreenWrapperElement.webkitRequestFullscreen();
        else if (fullscreenWrapperElement.mozRequestFullScreen) fullscreenWrapperElement.mozRequestFullScreen();
        else if (fullscreenWrapperElement.msRequestFullscreen) fullscreenWrapperElement.msRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
      }
    }

    function handleFullscreenChange() {
      const isWrapperFullscreen = document.fullscreenElement === fullscreenWrapperElement ||
                                  document.webkitFullscreenElement === fullscreenWrapperElement ||
                                  document.mozFullScreenElement === fullscreenWrapperElement ||
                                  document.msFullscreenElement === fullscreenWrapperElement;
      
      if (isWrapperFullscreen) {
        document.body.classList.add('body-in-presentation-fullscreen-mode');
        fullscreenButton.textContent = '창 모드';
        
        userScaleFactor = 1.0; 
        currentHorizontalAlignment = 'center'; 
        
        setTimeout(() => {
            updateFullscreenStyles(); 
            showAndResetFullscreenControlsTimer(); 
            setupFullscreenActivityListeners();
        }, 50);
        
      } else {
        document.body.classList.remove('body-in-presentation-fullscreen-mode');
        fullscreenButton.textContent = '전체 화면';
        
        // Reset styles applied directly by JS when exiting fullscreen
        fullscreenWrapperElement.style.alignItems = ''; 
        fullscreenWrapperElement.style.justifyContent = ''; 
        const allSlideContents = document.querySelectorAll('.slide-preview-content-4-3');
        allSlideContents.forEach(contentEl => {
            contentEl.style.transformOrigin = '';
            contentEl.style.transform = '';
        });

        if (navigationControlsElement) navigationControlsElement.classList.remove('controls-autohide');
        if (fullscreenPrevArrowEl) fullscreenPrevArrowEl.classList.remove('controls-autohide');
        if (fullscreenNextArrowEl) fullscreenNextArrowEl.classList.remove('controls-autohide');
        removeFullscreenActivityListeners();
      }
      // Re-apply styles appropriate for the new mode after a short delay
      setTimeout(() => showSlide(currentSlide), 100); 
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    if (scaleUpBtnFs) scaleUpBtnFs.addEventListener('click', () => { userScaleFactor = Math.min(3.0, userScaleFactor + 0.1); updateFullscreenStyles(); });
    if (scaleDownBtnFs) scaleDownBtnFs.addEventListener('click', () => { userScaleFactor = Math.max(0.3, userScaleFactor - 0.1); updateFullscreenStyles(); });
    if (alignLeftBtnFs) alignLeftBtnFs.addEventListener('click', () => { currentHorizontalAlignment = 'flex-start'; updateFullscreenStyles(); });
    if (alignCenterBtnFs) alignCenterBtnFs.addEventListener('click', () => { currentHorizontalAlignment = 'center'; updateFullscreenStyles(); });
    if (alignRightBtnFs) alignRightBtnFs.addEventListener('click', () => { currentHorizontalAlignment = 'flex-end'; updateFullscreenStyles(); });

    document.addEventListener('keydown', (event) => {
      const targetNodeName = (event.target && event.target instanceof HTMLElement) ? event.target.nodeName : '';
      if (targetNodeName === 'INPUT' || targetNodeName === 'TEXTAREA' || targetNodeName === 'SELECT') return;
      
      const isFullscreenActive = document.body.classList.contains('body-in-presentation-fullscreen-mode');

      switch (event.key) {
        case 'ArrowLeft': case 'PageUp': prevButton.click(); event.preventDefault(); break;
        case 'ArrowRight': case 'PageDown': case ' ': nextButton.click(); event.preventDefault(); break;
        case 'Escape': if (isFullscreenActive) { toggleFullscreen(); event.preventDefault(); } break;
        case 'f': case 'F': toggleFullscreen(); event.preventDefault(); break;
        case 'Home': if (currentSlide !== 0) { currentSlide = 0; showSlide(currentSlide); } event.preventDefault(); break;
        case 'End': if (currentSlide !== totalSlides - 1) { currentSlide = totalSlides - 1; showSlide(currentSlide); } event.preventDefault(); break;
      }
    });
    showSlide(0); 
  <\/script>
</body>
</html>
    `;
    return htmlContent;
  };

  const handleExport = () => {
    if (slides.length === 0) {
      alert("내보낼 슬라이드가 없습니다.");
      return;
    }
    const fullHtml = generateFullHtml();
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const safeTitle = presentationTitle.replace(/[^a-z0-9ㄱ-힣\\s]/gi, '_').replace(/\\s+/g, '_').toLowerCase() || '프레젠테이션';
    link.download = `${safeTitle}_프레젠테이션.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <button
      onClick={handleExport}
      disabled={slides.length === 0}
      className="bg-[#E60012] hover:bg-[#B8000F] text-white font-semibold py-2 px-3 sm:px-4 rounded-md shadow-sm transition duration-150 ease-in-out flex items-center text-xs sm:text-sm disabled:opacity-50"
      title="모든 슬라이드를 단일 HTML 파일로 다운로드합니다."
    >
      <DownloadIcon className="mr-1 sm:mr-2 w-4 h-4" />
      HTML로 내보내기
    </button>
  );
};

export default HtmlExportButton;