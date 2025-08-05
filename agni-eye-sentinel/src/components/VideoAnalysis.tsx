// import { useState, useEffect } from 'react';
// import { AlertTriangle, CheckCircle, Clock, Zap, Shield, Target, Download, Play, Pause, FileVideo, Camera } from 'lucide-react';

// interface VideoAnalysisProps {
//   file: File | null;
//   isAnalyzing: boolean;
//   onAnalyze: () => void;
// }

// interface DetectedObject {
//   type: string;
//   confidence: number;
//   position: string;
//   details: string;
// }

// interface FirstDetection {
//   frame_number: number;
//   timestamp: number;
//   time_formatted: string;
//   confidence: number;
//   position: string;
//   details: string;
// }

// interface TimelineEntry {
//   frame_number: number;
//   timestamp: number;
//   time_formatted: string;
//   analysis: string;
//   detected_objects: DetectedObject[];
//   first_detections_in_frame: string[];
// }

// interface VideoAnalysisResult {
//   analysis_id: string;
//   first_detections: Record<string, FirstDetection>;
//   detection_timeline: TimelineEntry[];
//   all_detected_objects: Record<string, any[]>;
//   summary: {
//     total_object_types: number;
//     total_frames_analyzed: number;
//   };
//   status: 'completed' | 'processing' | 'error';
//   error?: string;
// }

// interface ImageAnalysisResult {
//   analysis: string;
//   image_info: {
//     size: [number, number];
//     mode: string;
//     format: string;
//   };
//   status: 'completed' | 'error';
//   error?: string;
// }

// const VideoAnalysis = ({ file, isAnalyzing, onAnalyze }: VideoAnalysisProps) => {
//   const [result, setResult] = useState<VideoAnalysisResult | ImageAnalysisResult | null>(null);
//   const [progress, setProgress] = useState(0);
//   const [error, setError] = useState<string | null>(null);
//   const [localIsAnalyzing, setLocalIsAnalyzing] = useState(isAnalyzing);
//   const [analysisId, setAnalysisId] = useState<string | null>(null);
//   const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
//   const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);

//   const analyzeFile = async (file: File) => {
//     const formData = new FormData();
//     formData.append('file', file);
//     formData.append('confidence', '60');

//     try {
//       const response = await fetch('http://127.0.0.1:7000/upload', {
//         method: 'POST',
//         body: formData,
//       });
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const uploadResult = await response.json();
//       setAnalysisId(uploadResult.analysis_id);
      
//       if (uploadResult.file_type === 'video') {
//         // Start polling for video results
//         startPollingForResults(uploadResult.analysis_id);
//       } else {
//         // Image analysis is immediate
//         fetchResults(uploadResult.analysis_id);
//       }
      
//     } catch (err) {
//       console.error('Analysis failed:', err);
//       setError(err instanceof Error ? err.message : 'Analysis failed');
//       setLocalIsAnalyzing(false);
//     }
//   };

//   const startPollingForResults = (id: string) => {
//     const interval = setInterval(() => {
//       fetchResults(id);
//     }, 3000); // Poll every 3 seconds

//     setPollingInterval(interval);
//   };

//   const fetchResults = async (id: string) => {
//     try {
//       const response = await fetch(`http://127.0.0.1:7000/results/${id}`);
      
//       if (!response.ok) {
//         if (response.status === 404) {
//           // Results not ready yet, continue polling
//           return;
//         }
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const analysisResult = await response.json();
      
//       if (analysisResult.status === 'completed') {
//         setResult(analysisResult);
//         setLocalIsAnalyzing(false);
//         setProgress(100);
        
//         // Stop polling
//         if (pollingInterval) {
//           clearInterval(pollingInterval);
//           setPollingInterval(null);
//         }
//       } else if (analysisResult.status === 'error') {
//         setError(analysisResult.error || 'Analysis failed');
//         setLocalIsAnalyzing(false);
        
//         if (pollingInterval) {
//           clearInterval(pollingInterval);
//           setPollingInterval(null);
//         }
//       }
//       // If status is 'processing', continue polling
      
//     } catch (err) {
//       console.error('Failed to fetch results:', err);
//       setError(err instanceof Error ? err.message : 'Failed to fetch results');
//       setLocalIsAnalyzing(false);
      
//       if (pollingInterval) {
//         clearInterval(pollingInterval);
//         setPollingInterval(null);
//       }
//     }
//   };

//   const handleReanalyze = () => {
//     setResult(null);
//     setError(null);
//     setProgress(0);
//     setAnalysisId(null);
//     setSelectedTimestamp(null);
//     setLocalIsAnalyzing(true);
    
//     if (pollingInterval) {
//       clearInterval(pollingInterval);
//       setPollingInterval(null);
//     }
    
//     onAnalyze();
//   };

//   useEffect(() => {
//     if (localIsAnalyzing && file) {
//       setProgress(0);
//       setError(null);
      
//       const progressInterval = setInterval(() => {
//         setProgress((prev) => {
//           if (prev >= 85) {
//             clearInterval(progressInterval);
//             return 85;
//           }
//           return prev + 2;
//         });
//       }, 200);

//       analyzeFile(file);

//       return () => clearInterval(progressInterval);
//     }
//   }, [localIsAnalyzing, file]);

//   // Cleanup polling on component unmount
//   useEffect(() => {
//     return () => {
//       if (pollingInterval) {
//         clearInterval(pollingInterval);
//       }
//     };
//   }, [pollingInterval]);

//   const getThreatColor = (threatCount: number) => {
//     if (threatCount === 0) return 'text-green-500';
//     if (threatCount <= 2) return 'text-yellow-500';
//     if (threatCount <= 5) return 'text-orange-500';
//     if (threatCount <= 10) return 'text-red-500';
//     return 'text-red-700';
//   };

//   const getThreatIcon = (threatCount: number) => {
//     if (threatCount === 0) return <CheckCircle className="w-6 h-6 text-green-500" />;
//     if (threatCount <= 2) return <Clock className="w-6 h-6 text-yellow-500" />;
//     if (threatCount <= 5) return <AlertTriangle className="w-6 h-6 text-orange-500" />;
//     if (threatCount <= 10) return <AlertTriangle className="w-6 h-6 text-red-500" />;
//     return <Zap className="w-6 h-6 text-red-700" />;
//   };

//   const downloadReport = () => {
//     if (!result) return;

//     const reportContent = generateAnalysisReport(result);
//     const blob = new Blob([reportContent], { type: 'text/html' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `video-analysis-report-${new Date().toISOString().split('T')[0]}.html`;
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };

//   const generateAnalysisReport = (result: VideoAnalysisResult | ImageAnalysisResult): string => {
//     const isVideoResult = 'detection_timeline' in result;
    
//     return `
// <!DOCTYPE html>
// <html>
// <head>
//     <meta charset="UTF-8">
//     <title>Military ${isVideoResult ? 'Video' : 'Image'} Analysis Report</title>
//     <style>
//         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
        
//         * {
//             margin: 0;
//             padding: 0;
//             box-sizing: border-box;
//         }
        
//         body {
//             font-family: 'Inter', sans-serif;
//             line-height: 1.6;
//             color: #1a1a1a;
//             background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//             min-height: 100vh;
//             padding: 20px;
//         }
        
//         .report-container {
//             max-width: 1000px;
//             margin: 0 auto;
//             background: white;
//             border-radius: 20px;
//             box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
//             overflow: hidden;
//             border: 3px solid #667eea;
//         }
        
//         .header {
//             background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//             color: white;
//             padding: 40px;
//             text-align: center;
//             position: relative;
//         }
        
//         .header h1 {
//             font-size: 2.8rem;
//             font-weight: 800;
//             margin-bottom: 10px;
//             text-transform: uppercase;
//             letter-spacing: 3px;
//             text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
//         }
        
//         .content {
//             padding: 40px;
//         }
        
//         .section {
//             margin-bottom: 30px;
//         }
        
//         .section h2 {
//             font-size: 1.6rem;
//             color: #2c3e50;
//             margin-bottom: 20px;
//             padding-bottom: 10px;
//             border-bottom: 3px solid #667eea;
//             font-weight: 700;
//         }
        
//         .timeline-entry {
//             background: #f8f9fa;
//             margin-bottom: 15px;
//             padding: 20px;
//             border-radius: 10px;
//             border-left: 4px solid #667eea;
//         }
        
//         .detection-item {
//             background: white;
//             padding: 15px;
//             margin: 10px 0;
//             border-radius: 8px;
//             border-left: 4px solid #27ae60;
//             box-shadow: 0 2px 5px rgba(0,0,0,0.1);
//         }
//     </style>
// </head>
// <body>
//     <div class="report-container">
//         <div class="header">
//             <h1>Military ${isVideoResult ? 'Video' : 'Image'} Analysis</h1>
//             <div class="subtitle">AI-Powered Object Detection System</div>
//         </div>
        
//         <div class="content">
//             ${isVideoResult ? generateVideoReport(result as VideoAnalysisResult) : generateImageReport(result as ImageAnalysisResult)}
//         </div>
        
//         <div class="footer" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
//             <div>Generated: ${new Date().toLocaleString()}</div>
//             <div style="margin-top: 10px; opacity: 0.8;">Military Object Detection Analysis Report</div>
//         </div>
//     </div>
// </body>
// </html>`;
//   };

//   const generateVideoReport = (result: VideoAnalysisResult): string => {
//     return `
//       <div class="section">
//         <h2>Analysis Summary</h2>
//         <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px;">
//           <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; text-align: center;">
//             <h3>Object Types Detected</h3>
//             <div style="font-size: 2rem; font-weight: bold; color: #1976d2;">${result.summary.total_object_types}</div>
//           </div>
//           <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; text-align: center;">
//             <h3>Frames Analyzed</h3>
//             <div style="font-size: 2rem; font-weight: bold; color: #388e3c;">${result.summary.total_frames_analyzed}</div>
//           </div>
//         </div>
//       </div>
      
//       <div class="section">
//         <h2>First Detections</h2>
//         ${Object.entries(result.first_detections).map(([type, detection]) => `
//           <div class="detection-item">
//             <h4 style="color: #1976d2; text-transform: uppercase;">${type}</h4>
//             <p><strong>Time:</strong> ${detection.time_formatted}</p>
//             <p><strong>Confidence:</strong> ${detection.confidence}%</p>
//             <p><strong>Position:</strong> ${detection.position}</p>
//             <p><strong>Details:</strong> ${detection.details}</p>
//           </div>
//         `).join('')}
//       </div>
      
//       <div class="section">
//         <h2>Detection Timeline</h2>
//         ${result.detection_timeline.slice(0, 10).map(entry => `
//           <div class="timeline-entry">
//             <h4>Frame ${entry.frame_number} - ${entry.time_formatted}</h4>
//             ${entry.first_detections_in_frame.length > 0 ? 
//               `<p style="color: #d32f2f; font-weight: bold;">🚨 New detections: ${entry.first_detections_in_frame.join(', ')}</p>` : 
//               ''
//             }
//             <div style="margin-top: 10px; font-size: 0.9rem; color: #666;">
//               ${entry.analysis.substring(0, 300)}...
//             </div>
//           </div>
//         `).join('')}
//       </div>
//     `;
//   };

//   const generateImageReport = (result: ImageAnalysisResult): string => {
//     return `
//       <div class="section">
//         <h2>Image Information</h2>
//         <div style="background: #f5f5f5; padding: 20px; border-radius: 10px;">
//           <p><strong>Size:</strong> ${result.image_info.size[0]} x ${result.image_info.size[1]} pixels</p>
//           <p><strong>Mode:</strong> ${result.image_info.mode}</p>
//           <p><strong>Format:</strong> ${result.image_info.format}</p>
//         </div>
//       </div>
      
//       <div class="section">
//         <h2>Analysis Results</h2>
//         <div style="background: #f8f9fa; padding: 25px; border-radius: 15px; border-left: 4px solid #667eea;">
//           <pre style="white-space: pre-wrap; font-family: inherit;">${result.analysis}</pre>
//         </div>
//       </div>
//     `;
//   };

//   if (!file) {
//     return (
//       <div className="w-full max-w-2xl mx-auto">
//         <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-8 text-center border border-slate-600">
//           <FileVideo className="w-16 h-16 text-blue-400 mx-auto mb-4" />
//           <h3 className="text-xl font-bold text-amber-400 mb-2">
//             AWAITING MEDIA FILE
//           </h3>
//           <p className="text-green-400">
//             Upload a video or image for military object detection analysis
//           </p>
//         </div>
//       </div>
//     );
//   }

//   const isVideoFile = file.type.startsWith('video/');
//   const isVideoResult = result && 'detection_timeline' in result;
//   const totalDetections = isVideoResult ? Object.keys(result.first_detections).length : 0;

//   return (
//     <div className="w-full max-w-6xl mx-auto">
//       <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-8 border border-slate-600">
//         <div className="flex items-center justify-between mb-6">
//           <h3 className="text-2xl font-bold text-amber-400">
//             {isVideoFile ? 'VIDEO ANALYSIS' : 'IMAGE ANALYSIS'} - MILITARY DETECTION
//           </h3>
//           <div className="flex items-center space-x-2">
//             <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
//             <span className="text-green-400">AI SYSTEM ONLINE</span>
//           </div>
//         </div>

//         {!localIsAnalyzing && !result && !error && (
//           <div className="text-center">
//             <button
//               onClick={handleReanalyze}
//               className="bg-orange-500 hover:bg-orange-600 text-slate-900 font-bold px-8 py-4 text-lg rounded-lg flex items-center mx-auto"
//             >
//               <Zap className="w-5 h-5 mr-2" />
//               INITIATE ANALYSIS
//             </button>
//           </div>
//         )}

//         {error && (
//           <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
//             <div className="flex items-center space-x-2">
//               <AlertTriangle className="w-5 h-5 text-red-500" />
//               <span className="text-red-500 font-bold">ANALYSIS ERROR</span>
//             </div>
//             <p className="text-orange-400 mt-2">{error}</p>
//             <button
//               onClick={handleReanalyze}
//               className="bg-orange-500 hover:bg-orange-600 text-slate-900 font-bold px-6 py-3 mt-4 rounded-lg"
//             >
//               RETRY ANALYSIS
//             </button>
//           </div>
//         )}

//         {localIsAnalyzing && (
//           <div className="space-y-4">
//             <div className="flex items-center space-x-4">
//               <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
//               <span className="text-amber-400 font-bold">
//                 {isVideoFile ? 'ANALYZING VIDEO FRAMES...' : 'ANALYZING IMAGE...'} {progress}%
//               </span>
//             </div>
//             <div className="w-full bg-slate-700 rounded-full h-3">
//               <div 
//                 className="bg-gradient-to-r from-orange-500 to-amber-500 h-3 rounded-full transition-all duration-300"
//                 style={{ width: `${progress}%` }}
//               />
//             </div>
//             <div className="text-green-400 text-sm">
//               Processing file: {file.name}
//               {analysisId && <div className="text-xs text-slate-400">Analysis ID: {analysisId}</div>}
//             </div>
//           </div>
//         )}

//         {result && (
//           <div className="space-y-6">
//             <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-6 rounded-lg border border-slate-500">
//               <div className="flex items-center justify-between mb-4">
//                 <div className="flex items-center space-x-3">
//                   {isVideoResult ? getThreatIcon(totalDetections) : <Camera className="w-6 h-6 text-blue-500" />}
//                   <div>
//                     <h4 className={`text-xl font-bold ${isVideoResult ? getThreatColor(totalDetections) : 'text-blue-500'}`}>
//                       {isVideoResult ? `${totalDetections} OBJECT TYPES DETECTED` : 'IMAGE ANALYSIS COMPLETE'}
//                     </h4>
//                     <p className="text-slate-400">
//                       {isVideoFile ? 'Video Processing Complete' : 'Static Image Analysis'}
//                     </p>
//                   </div>
//                 </div>
//                 <div className="flex space-x-2">
//                   <button
//                     onClick={downloadReport}
//                     className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg flex items-center"
//                   >
//                     <Download className="w-4 h-4 mr-2" />
//                     EXPORT REPORT
//                   </button>
//                   <button
//                     onClick={handleReanalyze}
//                     className="bg-orange-500 hover:bg-orange-600 text-slate-900 font-bold px-4 py-2 rounded-lg"
//                   >
//                     RE-ANALYZE
//                   </button>
//                 </div>
//               </div>

//               {isVideoResult && (
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//                   <div className="bg-slate-900 p-4 rounded-lg">
//                     <div className="text-slate-400 text-sm">OBJECT TYPES</div>
//                     <div className={`text-lg font-bold ${getThreatColor(totalDetections)}`}>
//                       {totalDetections}
//                     </div>
//                   </div>
//                   <div className="bg-slate-900 p-4 rounded-lg">
//                     <div className="text-slate-400 text-sm">FRAMES ANALYZED</div>
//                     <div className="text-green-400 text-lg font-bold">
//                       {result.summary.total_frames_analyzed}
//                     </div>
//                   </div>
//                   <div className="bg-slate-900 p-4 rounded-lg">
//                     <div className="text-slate-400 text-sm">ANALYSIS ID</div>
//                     <div className="text-amber-400 text-sm font-mono">
//                       {result.analysis_id.substring(0, 8)}...
//                     </div>
//                   </div>
//                 </div>
//               )}

//               <div className="space-y-4">
//                 {isVideoResult ? (
//                   <>
//                     <div>
//                       <h5 className="text-amber-400 font-bold mb-2">FIRST DETECTIONS</h5>
//                       <div className="space-y-2">
//                         {Object.entries(result.first_detections).map(([type, detection]) => (
//                           <div key={type} className="bg-slate-800 p-4 rounded-lg">
//                             <div className="flex justify-between items-start">
//                               <div>
//                                 <div className="text-green-400 font-bold text-lg uppercase">{type}</div>
//                                 <div className="text-slate-300 text-sm">
//                                   First detected at {detection.time_formatted}
//                                 </div>
//                                 <div className="text-slate-400 text-xs mt-1">
//                                   Confidence: {detection.confidence}% | Position: {detection.position}
//                                 </div>
//                               </div>
//                               <button
//                                 onClick={() => setSelectedTimestamp(detection.timestamp)}
//                                 className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
//                               >
//                                 VIEW
//                               </button>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     </div>

//                     {selectedTimestamp !== null && (
//                       <div>
//                         <h5 className="text-amber-400 font-bold mb-2">TIMELINE DETAILS</h5>
//                         <div className="max-h-64 overflow-y-auto space-y-2">
//                           {result.detection_timeline
//                             .filter(entry => Math.abs(entry.timestamp - selectedTimestamp) < 2)
//                             .map((entry, index) => (
//                             <div key={index} className="bg-slate-800 p-3 rounded-lg">
//                               <div className="text-green-400 font-bold text-sm">
//                                 Frame {entry.frame_number} - {entry.time_formatted}
//                               </div>
//                               {entry.first_detections_in_frame.length > 0 && (
//                                 <div className="text-orange-400 text-sm mt-1">
//                                   🚨 New: {entry.first_detections_in_frame.join(', ')}
//                                 </div>
//                               )}
//                               <div className="text-slate-300 text-xs mt-2 max-h-20 overflow-y-auto">
//                                 {entry.analysis.substring(0, 200)}...
//                               </div>
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     )}
//                   </>
//                 ) : (
//                   <div>
//                     <h5 className="text-amber-400 font-bold mb-2">ANALYSIS RESULTS</h5>
//                     <div className="text-slate-300 bg-slate-800 p-4 rounded-lg max-h-96 overflow-y-auto">
//                       <pre className="whitespace-pre-wrap text-sm">
//                         {(result as ImageAnalysisResult).analysis}
//                       </pre>
//                     </div>
//                     <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
//                       <div className="bg-slate-800 p-2 rounded">
//                         <div className="text-slate-400">SIZE</div>
//                         <div className="text-green-400">{(result as ImageAnalysisResult).image_info.size.join(' × ')}</div>
//                       </div>
//                       <div className="bg-slate-800 p-2 rounded">
//                         <div className="text-slate-400">MODE</div>
//                         <div className="text-green-400">{(result as ImageAnalysisResult).image_info.mode}</div>
//                       </div>
//                       <div className="bg-slate-800 p-2 rounded">
//                         <div className="text-slate-400">FORMAT</div>
//                         <div className="text-green-400">{(result as ImageAnalysisResult).image_info.format}</div>
//                       </div>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {isVideoResult && totalDetections > 10 && (
//               <div className="bg-red-500/20 border border-red-500 p-4 rounded-lg animate-pulse">
//                 <div className="flex items-center space-x-2">
//                   <AlertTriangle className="w-6 h-6 text-red-500" />
//                   <span className="text-red-500 font-bold text-lg">
//                     HIGH ACTIVITY DETECTED
//                   </span>
//                 </div>
//                 <p className="text-red-400 mt-2">
//                   Multiple object types detected. Review detailed analysis and consider escalation.
//                 </p>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default VideoAnalysis;