export interface SavedWebsite {
  id: string;
  name: string;
  prompt: string;  // ✅ Changed from 'description' to 'prompt'
  htmlCode: string;
  timestamp: number;
  industry?: string;
}

export const STORAGE_KEY = 'sento_websites';
export const MAX_WEBSITES = 50;
