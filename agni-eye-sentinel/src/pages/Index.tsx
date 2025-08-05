
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import FileUpload from '@/components/FileUpload';
// import ThreatAnalysis from '@/components/ThreatAnalysis';
import RadarDisplay from '@/components/RadarDisplay';
import FileAnalysis from '@/components/FileAnalysis';
// import VideoDetectionApp from '@/components/VideoDetectionApp';
// import VideoAnalysis from '@/components/VideoAnalysis';

const Index = () => {
  const [showContent, setShowContent] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Show content after a brief loading period
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setIsAnalyzing(false);
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
  };

  return (
    <div className="min-h-screen professional-gradient">
      {/* Radar Display */}
      <RadarDisplay />
      
      {showContent && (
        <div className="animate-fade-in-up">
          {/* Header */}
          <div className="animate-scale-in">
            <Header />
          </div>
          
          {/* Main Content */}
          <main className="container mx-auto px-4 py-8">
            <div className="space-y-8">
              {/* File Upload Section */}
              <div className="animate-fade-in-up animate-delay-1">
                <FileUpload 
                  onFileUpload={handleFileUpload}
                  isAnalyzing={isAnalyzing}
                />
              </div>
              
              {/* Threat Analysis Section */}
              <div className="animate-fade-in-up animate-delay-2">
                <FileAnalysis 
                  file={uploadedFile}
                  isAnalyzing={isAnalyzing}
                  onAnalyze={handleAnalyze}
                />
              </div>
              {/* <div className="animate-fade-in-up animate-delay-2">
                <VideoDetectionApp
                  
                  
                />
              </div> */}
              {/* <div className="animate-fade-in-up animate-delay-2">
                <VideoAnalysis 
                  file={uploadedFile}
                  isAnalyzing={isAnalyzing}
                  onAnalyze={handleAnalyze}
                />
              </div> */}
            </div>
          </main>
          
          {/* Footer */}
          <footer className="animate-fade-in-up animate-delay-3 py-6 border-t border-border">
            <div className="container mx-auto px-4">
              <div className="text-center text-defense-blue font-heading">
                <p className="mb-2 font-semibold">
                  🇮🇳 BHARAT THREAT DETECTION SYSTEM 🇮🇳
                </p>
                <p className="text-sm text-defense-gray">
                  Advanced AI-Powered Threat Detection | Made in India
                </p>
              </div>
            </div>
          </footer>
        </div>
      )}
      
      {/* Loading Screen */}
      {!showContent && (
        <div className="fixed inset-0 flex items-center justify-center bg-defense-white z-40">
          <div className="text-center">
            <div className="mb-8">
              <div className="w-16 h-16 border-4 border-defense-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-heading font-bold text-defense-blue">
                INITIALIZING SYSTEM
              </h2>
              <p className="text-defense-gray font-sans">
                Loading advanced threat detection protocols...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
