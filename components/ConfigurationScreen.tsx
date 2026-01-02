import React, { useState } from 'react';
import { AppConfig } from '../types';
import { extractFolderId } from '../services/driveService';

interface ConfigurationScreenProps {
  onConfigSubmit: (config: AppConfig) => void;
}

const ConfigurationScreen: React.FC<ConfigurationScreenProps> = ({ onConfigSubmit }) => {
  const [driveApiKey, setDriveApiKey] = useState('');
  const [folderUrl, setFolderUrl] = useState('');
  const [clientName, setClientName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const folderId = extractFolderId(folderUrl);

    if (!driveApiKey.trim()) {
      setError('Please enter a Google Drive API Key.');
      return;
    }
    if (!folderId) {
      setError('Invalid Google Drive Folder URL or ID.');
      return;
    }

    onConfigSubmit({
      driveApiKey: driveApiKey.trim(),
      folderId,
      clientName: clientName.trim() || 'Valued Client'
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full glass-panel bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            <i className="fas fa-share-nodes"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">ProShare Setup</h1>
          <p className="text-gray-500 mt-2 text-sm">Create a professional portal for your Google Drive folder.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="e.g. Acme Corp"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Drive Folder Link</label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="https://drive.google.com/drive/folders/..."
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
            />
             <p className="text-xs text-gray-400 mt-1">Folder must be shared as "Anyone with link can view"</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Drive API Key</label>
            <input
              type="password"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="AIzaSy..."
              value={driveApiKey}
              onChange={(e) => setDriveApiKey(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Required to list files publicly.</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-primary hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02]"
          >
            Create Portal
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            <i className="fas fa-lock mr-1"></i> Keys are stored locally in your browser session.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationScreen;