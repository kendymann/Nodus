import { useState, useEffect } from 'react';

export function useCurrentTab() {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const browserApi = (globalThis as any).browser;

    async function getCurrentTab() {
      let tab: chrome.tabs.Tab | undefined;

      if (browserApi?.tabs?.query) {
        const tabs = await browserApi.tabs.query({ active: true, currentWindow: true });
        tab = tabs[0];
      } else {
        tab = await new Promise<chrome.tabs.Tab | undefined>((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            resolve(tabs[0]);
          });
        });
      }

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

