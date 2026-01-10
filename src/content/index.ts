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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_EXTRACTED_TEXT') {
    const text = extractArticleText();
    sendResponse({ text });
    return true;
  }
  return false;
});

