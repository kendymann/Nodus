import { useState, useEffect } from 'react';

export function useCurrentTab() {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    async function getCurrentTab() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        setUrl(tab.url);
      }
    }

    getCurrentTab();

    const listener = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.url) {
        setUrl(changeInfo.url);
      }
    };

    chrome.tabs.onActivated.addListener(async () => {
      await getCurrentTab();
    });

    chrome.tabs.onUpdated.addListener(listener);

    return () => {
      chrome.tabs.onUpdated.removeListener(listener);
    };
  }, []);

  return url;
}

