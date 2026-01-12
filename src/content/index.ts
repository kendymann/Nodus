// Add this at the top of the file
declare global {
  interface Window {
    find(
      str: string,
      caseSensitive?: boolean,
      backwards?: boolean,
      wrapAround?: boolean,
      wholeWord?: boolean,
      searchInFrames?: boolean,
      showDialog?: boolean
    ): boolean;
  }
}

// Make sure to export something or keep it as a module
export {};

import { Readability } from '@mozilla/readability';

function extractArticleText(): string | null {
  try {
    const documentClone = document.cloneNode(true) as Document;
    const reader = new Readability(documentClone, {
      debug: false,
      maxElemsToParse: 1000000,
      nbTopCandidates: 5,
      charThreshold: 500,
    });
    
    const article = reader.parse();

    if (article && article.textContent) {
      return article.textContent.trim();
    }

    const mainContent = document.querySelector('main, article, [role="main"]');
    if (mainContent) {
      return mainContent.textContent?.trim() || null;
    }

    const bodyClone = document.body.cloneNode(true) as HTMLElement;
    const scripts = bodyClone.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());
    return bodyClone.textContent?.trim() || null;
  } catch (error) {
    console.error('Readability extraction error:', error);
    const bodyClone = document.body.cloneNode(true) as HTMLElement;
    const scripts = bodyClone.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());
    return bodyClone.textContent?.trim() || null;
  }
}

function findAndHighlightText(quote: string): boolean {
  try {
    const cleanQuote = quote.replace(/^["']|["']$/g, '').trim();
    if (!cleanQuote || cleanQuote.length < 5) return false; // Avoid searching for tiny, generic strings

    // 1. CRITICAL: Clear existing selections to reset the window.find() state
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }

    // 2. Optimized find parameters:
    // aString, aCaseSensitive (false), aBackwards (false), aWrapAround (false), 
    // aWholeWord (false), aSearchInFrames (true), aShowDialog (false)
    const found = window.find(cleanQuote, false, false, false, false, true, false);

    if (found) {
      const newSelection = window.getSelection();
      if (newSelection && newSelection.rangeCount > 0) {
        const range = newSelection.getRangeAt(0);
        
        // 3. Target the specific text node's parent for scrolling
        const targetElement = range.startContainer.parentElement;

        if (targetElement) {
          // Scroll with a larger offset to ensure it's not hidden under your header
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });

          // 4. Visual Feedback: Use a temporary highlight class or inline style
          const originalBg = targetElement.style.backgroundColor;
          targetElement.style.backgroundColor = 'rgba(99, 102, 241, 0.4)'; // Indigo-500
          targetElement.style.transition = 'background-color 0.5s ease';

          setTimeout(() => {
            targetElement.style.backgroundColor = originalBg;
          }, 2500);

          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error('Nodus: Jump to source error:', error);
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_EXTRACTED_TEXT') {
    const text = extractArticleText();
    sendResponse({ text });
    return true;
  }
  
  if (message.type === 'MSG_FIND_TEXT') {
    const quote = message.payload?.quote;
    if (quote) {
      const found = findAndHighlightText(quote);
      sendResponse({ found });
      return true;
    }
    sendResponse({ found: false });
    return true;
  }
  
  return false;
});

