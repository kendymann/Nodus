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

    const onActivated = async () => {
      await getCurrentTab();
    };

    const onUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.url) {
        setUrl(changeInfo.url);
      }
    };

    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);

    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  return url;
}