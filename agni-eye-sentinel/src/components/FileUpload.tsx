import { useState, useRef, useCallback } from 'react';
import { Upload, Image, Video, X, CheckCircle, Shield, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnalysisResult {
  result: string;
  confidence: number;
}
interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isAnalyzing: boolean;
  onAnalysisComplete?: (result: AnalysisResult, fileUrl: string) => void;
  onError?: (error: string) => void;
}

const FileUpload = ({ onFileUpload, isAnalyzing, onAnalysisComplete, onError }: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzingLocal, setIsAnalyzingLocal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        handleFileSelection(file);
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      handleFileSelection(file);
    }
  }, []);

  const handleFileSelection = useCallback((file: File) => {
    // Check if file is an image or video
    if (!file.type.match('image.*') && !file.type.match('video.*')) {
      const errorMsg = 'Please select an image or video file';
      setError(errorMsg);
      onError?.(errorMsg);
      setUploadedFile(null);
      setPreviewUrl(null);
      return;
    }

    setUploadedFile(file);
    setError(null);
    onFileUpload(file);

    // Create a preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [onFileUpload, onError]);

  const handleAnalysis = useCallback(async () => {
    if (!uploadedFile) {
      const errorMsg = 'Please select a file to analyze';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsAnalyzingLocal(true);
    setProgress(0);
    setError(null);
    setAnalysisResult(null);

    // Simulate progress - in a real app, this would come from the actual upload progress
    const progressInterval = setInterval(() => {
      setProgress(prevProgress => {
        const newProgress = prevProgress + 10;
        if (newProgress >= 90) {
          clearInterval(progressInterval);
          return 90; // Stop at 90% until actual completion
        }
        return newProgress;
      });
    }, 500);

    try {
      const formData = new FormData();
      formData.append('image', uploadedFile);

      // Replace with your actual API endpoint
      const response = await fetch('http://127.0.0.1:8000/api/detect/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      setProgress(100);
      clearInterval(progressInterval);

      const result: AnalysisResult = await response.json();
      
      setAnalysisResult(result);
      // Call the completion callback with result and preview URL
      onAnalysisComplete?.(result, previewUrl || '');
    } catch (error) {
      const errorMsg = 'Error analyzing file: ' + (error as Error).message;
      setError(errorMsg);
      onError?.(errorMsg);
      clearInterval(progressInterval);
    } finally {
      setIsAnalyzingLocal(false);
    }
  }, [uploadedFile, previewUrl, onAnalysisComplete, onError]);

  const removeFile = useCallback(() => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setError(null);
    setProgress(0);
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const openFileSelector = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-defense-blue mb-2 font-orbitron">
          UPLOAD TARGET DATA
        </h2>
        <p className="text-defense-gray font-rajdhani">
          Upload image or video files for threat analysis
        </p>
      </div>

      <div
        className={`
          upload-zone relative min-h-[300px] rounded-lg p-8 cursor-pointer
          transition-all duration-300 border-2 border-dashed
          ${dragActive ? 'drag-over cyber-glow' : 'border-defense-border'}
          ${(isAnalyzing || isAnalyzingLocal) ? 'pointer-events-none opacity-50' : ''}
          ${!uploadedFile ? 'hover:border-defense-blue hover:shadow-cyber-glow' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileSelector}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isAnalyzing || isAnalyzingLocal}
        />

        {!uploadedFile ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Upload className="w-16 h-16 text-defense-blue mb-4 animate-glow-pulse" />
            <h3 className="text-xl font-orbitron font-semibold text-defense-blue mb-2">
              DRAG & DROP FILES HERE
            </h3>
            <p className="text-defense-gray font-rajdhani mb-4">
              or click to select files
            </p>
            <div className="flex items-center space-x-6 text-sm text-defense-white">
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-defense-card border border-defense-border">
                <Image className="w-4 h-4 text-defense-blue" />
                <span>Images</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-defense-card border border-defense-border">
                <Video className="w-4 h-4 text-defense-blue" />
                <span>Videos</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-defense-card rounded-lg border border-defense-border">
            <div className="flex items-center space-x-4">
              {uploadedFile.type.startsWith('image/') ? (
                <Image className="w-8 h-8 text-defense-green" />
              ) : (
                <Video className="w-8 h-8 text-defense-green" />
              )}
              <div>
                <p className="text-defense-white font-orbitron font-semibold">
                  {uploadedFile.name}
                </p>
                <p className="text-defense-gray font-rajdhani text-sm">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-6 h-6 text-defense-green" />
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                className="text-defense-red hover:text-defense-red hover:bg-defense-red/10 border border-defense-border"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {dragActive && (
          <div className="absolute inset-0 bg-defense-blue/10 rounded-lg flex items-center justify-center border-2 border-defense-blue">
            <div className="text-defense-blue text-xl font-orbitron font-bold animate-cyber-scan">
              DROP FILES HERE
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-4 p-4 bg-defense-red/20 border border-defense-red rounded-lg">
          <p className="text-defense-red font-rajdhani">{error}</p>
        </div>
      )}

      {/* Analysis button */}
      {uploadedFile && !(isAnalyzing || isAnalyzingLocal) && !analysisResult && (
        <div className="mt-6 flex justify-center">
          <Button
            onClick={handleAnalysis}
            className="bg-defense-blue hover:bg-defense-blue/80 text-defense-white px-8 py-3 font-orbitron font-semibold rounded-lg border border-defense-border transition-all duration-300"
          >
            ANALYZE FILE
          </Button>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="mt-6 p-6 bg-defense-card rounded-lg border border-defense-border">
          <div className="flex flex-col items-center text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
              analysisResult.result.toLowerCase() === 'real' 
                ? 'bg-defense-green/20 border-2 border-defense-green' 
                : 'bg-defense-red/20 border-2 border-defense-red'
            }`}>
              {analysisResult.result.toLowerCase() === 'real' ? (
                <Shield className="w-10 h-10 text-defense-green" />
              ) : (
                <AlertTriangle className="w-10 h-10 text-defense-red" />
              )}
            </div>
            
            <h3 className={`text-2xl font-orbitron font-bold mb-2 ${
              analysisResult.result.toLowerCase() === 'real' 
                ? 'text-defense-green' 
                : 'text-defense-red'
            }`}>
              {analysisResult.result.toUpperCase()}
            </h3>
            
            <p className="text-defense-gray font-rajdhani mb-4">
              {analysisResult.result.toLowerCase() === 'real' 
                ? 'Target appears to be authentic' 
                : 'Potential deepfake detected'}
            </p>
            
            <div className="w-full max-w-md bg-defense-card  border-defense-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                {/* <span className="text-defense-white font-orbitron font-semibold">CONFIDENCE</span>
                <span className="text-defense-blue font-orbitron font-bold">
                  {(analysisResult.confidence * 100).toFixed(2)}%
                </span> */}
              </div>
            
            </div>
            
            <div className="mt-4 flex items-center space-x-2 text-defense-gray">
              <Info className="w-4 h-4" />
              <span className="text-sm font-rajdhani">
                Analysis complete - {new Date().toLocaleTimeString()}
              </span>
            </div>
            
            <Button
              onClick={removeFile}
              className="mt-4 bg-defense-border hover:bg-defense-border/80 text-defense-white px-6 py-2 font-orbitron font-semibold rounded-lg border border-defense-border transition-all duration-300"
            >
              ANALYZE ANOTHER FILE
            </Button>
          </div>
        </div>
      )}

      {/* Loading state with progress */}
      {(isAnalyzing || isAnalyzingLocal) && (
        <div className="mt-6 p-6 bg-defense-card rounded-lg border border-defense-border">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-defense-blue/20 flex items-center justify-center mb-4">
              <div className="w-8 h-8 rounded-full border-2 border-defense-blue border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-lg font-orbitron font-semibold text-defense-blue mb-2">
              ANALYZING TARGET... {progress}%
            </h3>
            <p className="text-defense-gray font-rajdhani mb-4">
              Threat analysis in progress
            </p>
            <div className="w-full max-w-md bg-defense-border rounded-full h-2">
              <div 
                className="bg-defense-blue h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Waiting state when no file is uploaded */}
      {!uploadedFile && !(isAnalyzing || isAnalyzingLocal) && (
        <div className="mt-8 p-6 bg-defense-card rounded-lg border border-defense-border">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-defense-blue/20 flex items-center justify-center mb-4">
              <div className="w-8 h-8 rounded-full border-2 border-defense-blue border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-lg font-orbitron font-semibold text-defense-blue mb-2">
              AWAITING TARGET DATA
            </h3>
            <p className="text-defense-gray font-rajdhani">
              Upload a file to begin threat analysis
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;