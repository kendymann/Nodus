import { useState, useEffect } from 'react';
import type { GraphData } from '../types';

export function useChromeStorage(key: string): [GraphData | null, (value: GraphData | null) => void] {
  const [value, setValue] = useState<GraphData | null>(null);

  useEffect(() => {
    chrome.storage.local.get(key, (result) => {
      if (result[key]) {
        setValue(result[key]);
      }
    });

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[key]) {
        setValue(changes[key].newValue || null);
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, [key]);

  const updateValue = (newValue: GraphData | null) => {
    setValue(newValue);
    if (newValue) {
      chrome.storage.local.set({ [key]: newValue });
    } else {
      chrome.storage.local.remove(key);
    }
  };

  return [value, updateValue];
}

