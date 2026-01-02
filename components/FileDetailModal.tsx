import React, { useEffect, useState } from 'react';
import { DriveFile, GeminiAnalysis } from '../types';
import { analyzeFileWithGemini } from '../services/geminiService';
import { formatBytes } from '../services/driveService';

interface FileDetailModalProps {
  file: DriveFile | null;
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
}

const FileDetailModal: React.FC<FileDetailModalProps> = ({ file, isOpen, onClose, clientName }) => {
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && file) {
      setLoading(true);
      setAnalysis(null);
      analyzeFileWithGemini(file, clientName)
        .then(setAnalysis)
        .catch(() => setAnalysis(null))
        .finally(() => setLoading(false));
    }
  }, [isOpen, file, clientName]);

  if (!isOpen || !file) return null;

  const isImage = file.mimeType.startsWith('image/');
  // Google Drive thumbnails are often small, hack to get larger size
  const largeImage = file.thumbnailLink ? file.thumbnailLink.replace('s220', 's1000') : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Preview Section */}
        <div className="md:w-1/2 bg-gray-100 p-8 flex items-center justify-center relative">
          {isImage ? (
            <img 
              src={largeImage} 
              alt={file.name} 
              className="max-h-[60vh] object-contain shadow-lg rounded-lg" 
            />
          ) : (
            <div className="text-center p-12">
              <i className={`fas fa-file text-6xl text-gray-400 mb-4`}></i>
              <p className="text-gray-500 font-medium text-lg">Preview not available</p>
            </div>
          )}
          
          <div className="absolute top-4 left-4 bg-white/80 px-3 py-1 rounded-full text-xs font-bold text-gray-600 backdrop-blur-sm">
            {file.mimeType.split('/').pop()?.toUpperCase()}
          </div>
        </div>

        {/* Details Section */}
        <div className="md:w-1/2 p-8 flex flex-col h-full overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-800 break-words leading-tight">{file.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 transition-colors">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* AI Analysis */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <i className="fas fa-sparkles"></i> AI Insight
            </h3>
            
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : analysis ? (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-gray-700 text-sm mb-3 italic">"{analysis.professionalNote}"</p>
                <p className="text-gray-600 text-sm mb-3">{analysis.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-white text-blue-600 text-xs font-medium rounded-md border border-blue-200 shadow-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">AI analysis unavailable.</p>
            )}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Size</p>
              <p className="font-semibold text-gray-800">{formatBytes(file.size)}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Created</p>
              <p className="font-semibold text-gray-800">
                {file.createdTime ? new Date(file.createdTime).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto space-y-3">
            {file.webContentLink && (
              <a 
                href={file.webContentLink} 
                className="block w-full text-center py-3 px-4 bg-primary hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5"
              >
                <i className="fas fa-download mr-2"></i> Download File
              </a>
            )}
            
            {file.webViewLink && (
              <a 
                href={file.webViewLink} 
                target="_blank" 
                rel="noreferrer"
                className="block w-full text-center py-3 px-4 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                <i className="fab fa-google-drive mr-2"></i> Open in Drive
              </a>
            )}
          </div>
          
          <p className="text-xs text-center text-gray-400 mt-4">
            <i className="fas fa-shield-alt mr-1"></i> Secure direct download from Google Servers
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileDetailModal;