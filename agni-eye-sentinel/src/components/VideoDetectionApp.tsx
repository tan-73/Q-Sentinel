// import React, { useState, useRef } from 'react';
// import { Upload, Play, FileVideo, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// interface DetectionResult {
//   message?: string;
//   download_url?: string;
//   error?: string;
//   result_path?: string;
//   original_filename?: string;
// }

// interface LogEntry {
//   frame: string;
//   detections: string;
//   totalTime: string;
//   preprocessTime: string;
//   inferenceTime: string;
//   postprocessTime: string;
// }

// const VehicleDetectionApp: React.FC = () => {
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);
//   const [isUploading, setIsUploading] = useState(false);
//   const [result, setResult] = useState<DetectionResult | null>(null);
//   const [logs, setLogs] = useState<LogEntry[]>([]);
//   const [dragOver, setDragOver] = useState(false);
//   const [processedVideoUrl, setProcessedVideoUrl] = useState<string>('');
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const parseLogs = (logText: string): LogEntry[] => {
//     const lines = logText.split('\n').filter(line => line.trim());
//     const entries: LogEntry[] = [];
    
//     lines.forEach(line => {
//       const match = line.match(/0: 384x640 (.+?), (\d+\.?\d*)ms\s*Speed: (\d+\.?\d*)ms preprocess, (\d+\.?\d*)ms inference, (\d+\.?\d*)ms postprocess/);
//       if (match) {
//         entries.push({
//           frame: `Frame ${entries.length + 1}`,
//           detections: match[1],
//           totalTime: match[2],
//           preprocessTime: match[3],
//           inferenceTime: match[4],
//           postprocessTime: match[5]
//         });
//       }
//     });
    
//     return entries;
//   };

//   const handleFileSelect = (file: File) => {
//     if (file && file.type.startsWith('video/')) {
//       setSelectedFile(file);
//       setResult(null);
//       setLogs([]);
//       setProcessedVideoUrl('');
//     } else {
//       alert('Please select a video file');
//     }
//   };

//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     setDragOver(false);
//     const file = e.dataTransfer.files[0];
//     handleFileSelect(file);
//   };

//   const handleDragOver = (e: React.DragEvent) => {
//     e.preventDefault();
//     setDragOver(true);
//   };

//   const handleDragLeave = () => {
//     setDragOver(false);
//   };

//   const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) handleFileSelect(file);
//   };

//   const uploadFile = async () => {
//     if (!selectedFile) return;

//     setIsUploading(true);
//     const formData = new FormData();
//     formData.append('file', selectedFile);

//     try {
//       const response = await fetch('http://127.0.0.1:7000/detect', {
//         method: 'POST',
//         body: formData,
//       });

//       const data = await response.json();
//       setResult(data);

//       // Set the processed video URL if available
//       if (data.download_url) {
//         setProcessedVideoUrl(data.download_url);
//       }

//       // If there's log data in the response or console output, parse it
//       // For now, we'll simulate some sample data since the actual logs come from server console
//       const sampleLogs = `0: 384x640 1 Vehicle, 249.0ms
// Speed: 1.0ms preprocess, 249.0ms inference, 1.0ms postprocess per image at shape (1, 3, 384, 640)
// 0: 384x640 2 Vehicles, 227.0ms
// Speed: 1.0ms preprocess, 227.0ms inference, 1.0ms postprocess per image at shape (1, 3, 384, 640)
// 0: 384x640 (no detections), 229.0ms
// Speed: 2.0ms preprocess, 229.0ms inference, 1.0ms postprocess per image at shape (1, 3, 384, 640)`;
      
//       setLogs(parseLogs(sampleLogs));
//     } catch (error) {
//       setResult({ error: 'Failed to upload file. Make sure the server is running.' });
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   const getDetectionStats = () => {
//     if (logs.length === 0) return null;
    
//     const totalFrames = logs.length;
//     const framesWithDetections = logs.filter(log => !log.detections.includes('no detections')).length;
//     const avgInferenceTime = logs.reduce((sum, log) => sum + parseFloat(log.inferenceTime), 0) / totalFrames;
    
//     return {
//       totalFrames,
//       framesWithDetections,
//       avgInferenceTime: avgInferenceTime.toFixed(1)
//     };
//   };

//   const stats = getDetectionStats();

//   return (

//     <div className="min-h-screen bg-gradient-to-br  text-white">
//       <div className="container mx-auto px-6 py-8">
//         <div className="text-center mb-8">
//           <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
//             Vehicle Detection System
//           </h1>
//           <p className="text-slate-300 text-lg">Upload a video to detect vehicles using AI</p>
//         </div>

//         {/* Upload Area */}
//         <div className="max-w-2xl mx-auto mb-8">
//           <div
//             className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
//               dragOver
//                 ? 'border-blue-400 bg-blue-400/10'
//                 : 'border-slate-600 hover:border-slate-500'
//             } ${selectedFile ? 'bg-green-400/10 border-green-400' : ''}`}
//             onDrop={handleDrop}
//             onDragOver={handleDragOver}
//             onDragLeave={handleDragLeave}
//             onClick={() => window.open('http://localhost:8501', '_blank')}
//           >
//             <input
//               ref={fileInputRef}
//               type="file"
//               accept="video/*"
//               onChange={handleFileInputChange}
//               className="hidden"
//             />
            
//             {selectedFile ? (
//               <div className="space-y-4">
//                 <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
//                 <div>
//                   <h3 className="text-xl font-semibold text-green-400 mb-2">File Selected</h3>
//                   <p className="text-slate-300">{selectedFile.name}</p>
//                   <p className="text-sm text-slate-400">
//                     {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
//                   </p>
//                 </div>
//               </div>
//             ) : (
//               <div className="space-y-4">
//                 <Upload className="w-16 h-16 text-slate-400 mx-auto" />
//                 <div>
//                   <h3 className="text-xl font-semibold mb-2">Drop your video here</h3>
//                   <p className="text-slate-400">or click to browse files</p>
//                 </div>
//               </div>
//             )}
//           </div>

//           {selectedFile && (
//             <button
//               onClick={uploadFile}
//               disabled={isUploading}
//               className="w-full mt-6 bg-gradient hover:from-blue-600 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
//             >
//               {isUploading ? (
//                 <>
//                   <Loader2 className="w-5 h-5 animate-spin" />
//                   <span>Processing...</span>
//                 </>
//               ) : (
//                 <>
//                   <Play className="w-5 h-5" />
//                   <span>Start Detection</span>
//                 </>
//               )}
//             </button>
//           )}
//         </div>

//         {/* Results */}
//         {result && (
//           <div className="max-w-4xl mx-auto">
//             {result.error ? (
//               <div className="bg-red-400/10 border border-red-400 rounded-xl p-6 mb-6">
//                 <div className="flex items-center space-x-3">
//                   <AlertCircle className="w-6 h-6 text-red-400" />
//                   <h3 className="text-xl font-semibold text-red-400">Error</h3>
//                 </div>
//                 <p className="text-red-300 mt-2">{result.error}</p>
//               </div>
//             ) : (
//               <div className="space-y-6">
//                 {/* Success Message and Video Display */}
//                 <div className="bg-green-400/10 border border-green-400 rounded-xl p-6">
//                   <div className="flex items-center space-x-3 mb-4">
//                     <CheckCircle className="w-6 h-6 text-green-400" />
//                     <h3 className="text-xl font-semibold text-green-400">Detection Complete</h3>
//                   </div>
//                   <p className="text-green-300 mb-4">{result.message}</p>
                  
//                   {/* Processed Video Display */}
//                   {processedVideoUrl && (
//                     <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
//                       <h4 className="text-lg font-semibold mb-3 text-white">Processed Video with Detections</h4>
//                       <div className="relative bg-black rounded-lg overflow-hidden">
//                         <video 
//                           controls 
//                           className="w-full max-h-96 object-contain"
//                           poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23374151'/%3E%3Ctext x='200' y='150' text-anchor='middle' fill='%239CA3AF' font-family='Arial' font-size='16'%3EProcessed Video%3C/text%3E%3C/svg%3E"
//                         >
//                           <source src={processedVideoUrl} type="video/mp4" />
//                           <source src={processedVideoUrl} type="video/webm" />
//                           <source src={processedVideoUrl} type="video/avi" />
//                           Your browser does not support the video tag.
//                         </video>
//                       </div>
//                       <p className="text-sm text-slate-400 mt-2">
//                         📹 Video shows detected vehicles with bounding boxes and labels
//                       </p>
//                     </div>
//                   )}

//                   {/* Original Video Preview */}
//                   {selectedFile && (
//                     <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
//                       <h4 className="text-lg font-semibold mb-3 text-white">Original Video</h4>
//                       <div className="relative bg-black rounded-lg overflow-hidden">
//                         <video 
//                           controls 
//                           className="w-full max-h-96 object-contain"
//                           src={URL.createObjectURL(selectedFile)}
//                         />
//                       </div>
//                       <p className="text-sm text-slate-400 mt-2">
//                         📁 {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
//                       </p>
//                     </div>
//                   )}
                  
//                   {result.download_url && (
//                     <a
//                       href={result.download_url}
//                       download
//                       className="inline-flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
//                     >
//                       <FileVideo className="w-4 h-4" />
//                       <span>Download Processed Video</span>
//                     </a>
//                   )}
//                 </div>

//                 {/* Statistics */}
//                 {stats && (
//                   <div className="bg-slate-800/50 rounded-xl p-6">
//                     <h3 className="text-xl font-semibold mb-4">Detection Statistics</h3>
//                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                       <div className="bg-slate-700/50 rounded-lg p-4">
//                         <div className="text-2xl font-bold text-blue-400">{stats.totalFrames}</div>
//                         <div className="text-slate-300">Total Frames</div>
//                       </div>
//                       <div className="bg-slate-700/50 rounded-lg p-4">
//                         <div className="text-2xl font-bold text-green-400">{stats.framesWithDetections}</div>
//                         <div className="text-slate-300">Frames with Vehicles</div>
//                       </div>
//                       <div className="bg-slate-700/50 rounded-lg p-4">
//                         <div className="text-2xl font-bold text-purple-400">{stats.avgInferenceTime}ms</div>
//                         <div className="text-slate-300">Avg Inference Time</div>
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 {/* Frame-by-Frame Results */}
//                 {logs.length > 0 && (
//                   <div className="bg-slate-800/50 rounded-xl p-6">
//                     <h3 className="text-xl font-semibold mb-4">Frame-by-Frame Analysis</h3>
//                     <div className="overflow-x-auto">
//                       <table className="w-full text-sm">
//                         <thead>
//                           <tr className="border-b border-slate-600">
//                             <th className="text-left py-3 px-4">Frame</th>
//                             <th className="text-left py-3 px-4">Detections</th>
//                             <th className="text-left py-3 px-4">Total Time</th>
//                             <th className="text-left py-3 px-4">Inference</th>
//                             <th className="text-left py-3 px-4">Preprocess</th>
//                             <th className="text-left py-3 px-4">Postprocess</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {logs.slice(0, 20).map((log, index) => (
//                             <tr key={index} className="border-b border-slate-700/50">
//                               <td className="py-3 px-4 font-medium">{log.frame}</td>
//                               <td className="py-3 px-4">
//                                 <span className={`px-2 py-1 rounded text-xs ${
//                                   log.detections.includes('no detections')
//                                     ? 'bg-red-400/20 text-red-400'
//                                     : 'bg-green-400/20 text-green-400'
//                                 }`}>
//                                   {log.detections}
//                                 </span>
//                               </td>
//                               <td className="py-3 px-4">{log.totalTime}ms</td>
//                               <td className="py-3 px-4">{log.inferenceTime}ms</td>
//                               <td className="py-3 px-4">{log.preprocessTime}ms</td>
//                               <td className="py-3 px-4">{log.postprocessTime}ms</td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                       {logs.length > 20 && (
//                         <p className="text-slate-400 text-center mt-4">
//                           Showing first 20 frames out of {logs.length} total
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default VehicleDetectionApp;