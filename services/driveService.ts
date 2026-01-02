import { DriveFile } from '../types';

/**
 * Extracts the Folder ID from a full Google Drive URL or returns the ID if passed directly.
 */
export const extractFolderId = (input: string): string | null => {
  // Regex for standard folder URLs
  const urlRegex = /folders\/([a-zA-Z0-9-_]+)/;
  const match = input.match(urlRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Basic check if input looks like an ID (long alphanumeric string)
  if (/^[a-zA-Z0-9-_]{15,}$/.test(input)) {
    return input;
  }
  
  return null;
};

/**
 * Fetches files from a public Google Drive folder using an API Key.
 * Note: The folder must be shared as "Anyone with the link" for API Key access to work without OAuth.
 */
export const fetchDriveFiles = async (folderId: string, apiKey: string): Promise<DriveFile[]> => {
  const query = `'${folderId}' in parents and trashed = false`;
  const fields = 'files(id, name, mimeType, thumbnailLink, iconLink, webViewLink, webContentLink, size, createdTime, description)';
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${apiKey}&fields=${encodeURIComponent(fields)}&orderBy=folder,name`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch Drive files');
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("Drive API Error:", error);
    throw error;
  }
};

/**
 * Formats bytes to human readable string
 */
export const formatBytes = (bytes?: string | number, decimals = 2) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Number(bytes)) / Math.log(k));
  return parseFloat((Number(bytes) / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Determines a simplified file type category
 */
export const getFileTypeCategory = (mimeType: string): 'folder' | 'image' | 'pdf' | 'document' | 'other' => {
  if (mimeType === 'application/vnd.google-apps.folder') return 'folder';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  return 'other';
};