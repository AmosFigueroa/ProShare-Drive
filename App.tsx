import React, { useState, useEffect } from 'react';
import ConfigurationScreen from './components/ConfigurationScreen';
import FileDetailModal from './components/FileDetailModal';
import { AppConfig, DriveFile, ViewMode } from './types';
import { fetchDriveFiles, getFileTypeCategory, formatBytes } from './services/driveService';
import { generateWelcomeMessage } from './services/geminiService';

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState(false);

  // Load configuration from URL hash if available (Simulating a shared custom link)
  useEffect(() => {
    const hash = window.location.hash.substring(1); // Remove #
    if (hash.startsWith('config=')) {
        try {
            const decoded = JSON.parse(atob(hash.split('config=')[1]));
            setConfig(decoded);
        } catch (e) {
            console.error("Failed to load config from URL");
        }
    }
  }, []);

  useEffect(() => {
    if (config) {
      const loadFiles = async () => {
        setLoading(true);
        setError('');
        try {
          const driveFiles = await fetchDriveFiles(config.folderId, config.driveApiKey);
          setFiles(driveFiles);
          
          // Generate AI Welcome Message
          setLoadingAI(true);
          generateWelcomeMessage(config.clientName, driveFiles)
            .then(setWelcomeMessage)
            .finally(() => setLoadingAI(false));

        } catch (err: any) {
          setError(err.message || 'Failed to load files. Ensure API Key is valid and folder is public.');
        } finally {
          setLoading(false);
        }
      };
      loadFiles();
    }
  }, [config]);

  const handleConfigSubmit = (newConfig: AppConfig) => {
    setConfig(newConfig);
    // In a real app, you might save this state or generate a shareable link here
    // For demo, we just update state
  };

  const getShareableLink = () => {
      if(!config) return;
      const payload = btoa(JSON.stringify(config));
      const url = `${window.location.origin}${window.location.pathname}#config=${payload}`;
      navigator.clipboard.writeText(url);
      alert("Link copied! You can send this URL to your client.");
  };

  if (!config) {
    return <ConfigurationScreen onConfigSubmit={handleConfigSubmit} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <i className="fab fa-google-drive text-xl"></i>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-none">Shared Resources</h1>
              <p className="text-xs text-gray-500 mt-1">for {config.clientName}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
             <button 
              onClick={getShareableLink}
              className="p-2 text-gray-500 hover:text-primary transition-colors hidden sm:block"
              title="Copy Share Link"
            >
              <i className="fas fa-link"></i>
            </button>
            <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>
            <button 
              onClick={() => setViewMode(ViewMode.GRID)}
              className={`p-2 rounded-lg transition-all ${viewMode === ViewMode.GRID ? 'bg-gray-100 text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <i className="fas fa-th-large"></i>
            </button>
            <button 
              onClick={() => setViewMode(ViewMode.LIST)}
              className={`p-2 rounded-lg transition-all ${viewMode === ViewMode.LIST ? 'bg-gray-100 text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <i className="fas fa-list"></i>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        
        {/* Welcome Header */}
        <div className="mb-10 mt-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Dashboard</h2>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
             <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full shrink-0">
                <i className="fas fa-robot"></i>
             </div>
             <div className="flex-1">
               {loadingAI ? (
                 <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
               ) : (
                 <p className="text-gray-600 text-lg leading-relaxed">{welcomeMessage}</p>
               )}
               <p className="text-xs text-gray-400 mt-2 font-medium">Generated by Gemini AI • {files.length} items available</p>
             </div>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 mb-6 flex items-center">
             <i className="fas fa-exclamation-triangle mr-3 text-xl"></i>
             <div>
               <p className="font-bold">Access Error</p>
               <p className="text-sm">{error}</p>
               <button onClick={() => setConfig(null)} className="text-sm underline mt-2 hover:text-red-800">
                 Back to Configuration
               </button>
             </div>
          </div>
        )}

        {/* File Grid/List */}
        {!loading && !error && files.length === 0 && (
           <div className="text-center py-20 text-gray-400">
             <i className="fas fa-folder-open text-6xl mb-4"></i>
             <p>This folder is empty.</p>
           </div>
        )}

        {!loading && !error && files.length > 0 && (
          <div className={viewMode === ViewMode.GRID 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
            : "flex flex-col space-y-3"
          }>
            {files.map((file) => {
              const category = getFileTypeCategory(file.mimeType);
              const iconClass = category === 'folder' ? 'fa-folder text-yellow-400' 
                : category === 'image' ? 'fa-image text-purple-500' 
                : category === 'pdf' ? 'fa-file-pdf text-red-500' 
                : 'fa-file-alt text-blue-400';

              if (viewMode === ViewMode.GRID) {
                return (
                  <div 
                    key={file.id} 
                    onClick={() => setSelectedFile(file)}
                    className="group bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative"
                  >
                    {/* Thumbnail Area */}
                    <div className="aspect-[4/3] bg-gray-50 relative flex items-center justify-center overflow-hidden border-b border-gray-100">
                      {file.thumbnailLink ? (
                        <img 
                          src={file.thumbnailLink.replace('s220', 's600')} 
                          alt={file.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                         <i className={`fas ${iconClass} text-5xl opacity-50`}></i>
                      )}
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                         <span className="text-white bg-white/20 px-4 py-2 rounded-full backdrop-blur-md border border-white/30 font-medium">
                           View Details
                         </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between">
                         <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0 mr-3">
                           <i className={`fas ${iconClass} text-lg`}></i>
                         </div>
                         <div className="flex-1 min-w-0">
                           <h3 className="font-semibold text-gray-800 truncate text-sm mb-1">{file.name}</h3>
                           <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                         </div>
                      </div>
                    </div>
                  </div>
                );
              } else {
                // List View
                return (
                   <div 
                    key={file.id} 
                    onClick={() => setSelectedFile(file)}
                    className="group bg-white p-4 rounded-xl border border-gray-100 flex items-center cursor-pointer hover:shadow-md transition-all hover:bg-gray-50"
                  >
                     <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mr-4">
                         <i className={`fas ${iconClass} text-lg`}></i>
                     </div>
                     <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate text-sm">{file.name}</h3>
                     </div>
                     <div className="text-xs text-gray-400 mx-4 hidden sm:block">
                        {new Date(file.createdTime || '').toLocaleDateString()}
                     </div>
                     <div className="text-xs font-mono text-gray-500 mr-4">
                        {formatBytes(file.size)}
                     </div>
                     <div className="text-gray-300 group-hover:text-primary">
                        <i className="fas fa-chevron-right"></i>
                     </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto p-6 text-center text-gray-400 text-xs mt-10 border-t border-gray-200">
        <p>
          <i className="fas fa-shield-alt text-green-500 mr-1"></i> 
          Secure Client Portal • Data transferred directly from Google Drive
        </p>
      </footer>

      {/* Modal */}
      <FileDetailModal 
        file={selectedFile} 
        isOpen={!!selectedFile} 
        onClose={() => setSelectedFile(null)}
        clientName={config.clientName}
      />
    </div>
  );
};

export default App;