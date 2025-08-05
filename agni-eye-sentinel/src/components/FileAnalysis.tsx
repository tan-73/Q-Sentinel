import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap, 
  Shield, 
  Target, 
  Download, 
  Play, 
  Pause, 
  FileVideo, 
  Camera 
} from 'lucide-react';

interface FileAnalysisProps {
  file: File | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

interface ThreatResult {
  threat: string;
  confidence: number;
  level: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: string;
  recommendations: string[];
  fullAnalysis: string;
  isThreatDetected: boolean;
  analysisTimestamp: string;
  filename: string;
}

interface DetectedObject {
  type: string;
  confidence: number;
  position: string;
  details: string;
}

interface FirstDetection {
  frame_number: number;
  timestamp: number;
  time_formatted: string;
  confidence: number;
  position: string;
  details: string;
}

interface TimelineEntry {
  frame_number: number;
  timestamp: number;
  time_formatted: string;
  analysis: string;
  detected_objects: DetectedObject[];
  first_detections_in_frame: string[];
}

interface VideoAnalysisResult {
  analysis_id: string;
  first_detections: Record<string, FirstDetection>;
  detection_timeline: TimelineEntry[];
  all_detected_objects: Record<string, any[]>;
  summary: {
    total_object_types: number;
    total_frames_analyzed: number;
  };
  status: 'completed' | 'processing' | 'error';
  error?: string;
}

interface ImageAnalysisResult {
  analysis: string;
  image_info: {
    size: [number, number];
    mode: string;
    format: string;
  };
  status: 'completed' | 'error';
  error?: string;
}

const FileAnalysis = ({ file, isAnalyzing, onAnalyze }: FileAnalysisProps) => {
  const [result, setResult] = useState<ThreatResult | VideoAnalysisResult | ImageAnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [localIsAnalyzing, setLocalIsAnalyzing] = useState(isAnalyzing);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);

  const isImageFile = file?.type.startsWith('image/') || file?.name.toLowerCase().endsWith('.jpg') || file?.name.toLowerCase().endsWith('.jpeg') || file?.name.toLowerCase().endsWith('.png');
  const isVideoFile = file?.type.startsWith('video/') || file?.name.toLowerCase().endsWith('.mp4') || file?.name.toLowerCase().endsWith('.mov');
  const isVideoResult = result && 'detection_timeline' in result;
  const isThreatResult = result && 'threat' in result;
  const totalDetections = isVideoResult ? Object.keys((result as VideoAnalysisResult).first_detections).length : 0;

  const analyzeFile = async (file: File) => {
    if (isImageFile) {
      await analyzeImage(file);
    } else if (isVideoFile) {
      await analyzeVideo(file);
    } else {
      setError('Unsupported file type. Please upload an image (JPG/PNG) or video (MP4).');
      setLocalIsAnalyzing(false);
    }
  };

  const analyzeImage = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('analysis_type', 'threat');

    try {
      const response = await fetch('http://127.0.0.1:8000/detect', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const htmlText = await response.text();
      
      // Extract the analysis from the HTML response
      const analysisMatch = htmlText.match(/<pre[^>]*>(.*?)<\/pre>/s);
      const analysis = analysisMatch ? analysisMatch[1].replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") : 'Analysis completed';
      
      // Parse the analysis based on actual LLM response
      const parsedResult = parseAnalysisResponse(analysis, file.name);
      
      setResult(parsedResult);
      setLocalIsAnalyzing(false);
    } catch (err) {
      console.error('Image analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Image analysis failed');
      setLocalIsAnalyzing(false);
    }
  };

  const analyzeVideo = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('confidence', '60');

    try {
      const response = await fetch('http://127.0.0.1:7000/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const uploadResult = await response.json();
      setAnalysisId(uploadResult.analysis_id);
      
      // Start polling for video results
      startPollingForResults(uploadResult.analysis_id);
      
    } catch (err) {
      console.error('Video analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Video analysis failed');
      setLocalIsAnalyzing(false);
    }
  };

  const startPollingForResults = (id: string) => {
    const interval = setInterval(() => {
      fetchVideoResults(id);
    }, 3000); // Poll every 3 seconds

    setPollingInterval(interval);
  };

  const fetchVideoResults = async (id: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:7000/results/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Results not ready yet, continue polling
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const analysisResult = await response.json();
      
      if (analysisResult.status === 'completed') {
        setResult(analysisResult);
        setLocalIsAnalyzing(false);
        setProgress(100);
        
        // Stop polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      } else if (analysisResult.status === 'error') {
        setError(analysisResult.error || 'Video analysis failed');
        setLocalIsAnalyzing(false);
        
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
      // If status is 'processing', continue polling
      
    } catch (err) {
      console.error('Failed to fetch video results:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch video results');
      setLocalIsAnalyzing(false);
      
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  };

  const parseAnalysisResponse = (analysis: string, filename: string): ThreatResult => {
    // Extract threat level using improved logic
    const threatLevel = extractThreatLevelFromLLM(analysis);
    const isThreatDetected = threatLevel !== 'SAFE';
    
    // Determine confidence based on analysis detail and clarity
    let confidence = 75; // Base confidence
    
    // Increase confidence if analysis is detailed
    const analysisLength = analysis.length;
    if (analysisLength > 1000) confidence += 10;
    if (analysisLength > 2000) confidence += 5;
    
    // Increase confidence if specific indicators are mentioned
    const specificTerms = ['IDENTIFIED', 'DETECTED', 'CONFIRMED', 'VISIBLE', 'PRESENT'];
    const specificTermCount = specificTerms.filter(term => analysis.toUpperCase().includes(term)).length;
    confidence += specificTermCount * 2;
    
    // Cap confidence at reasonable levels
    confidence = Math.min(confidence, threatLevel === 'SAFE' ? 95 : 90);
    
    // Generate threat description
    let threat = 'NO THREAT DETECTED';
    if (isThreatDetected) {
      threat = `${threatLevel} THREAT DETECTED`;
    }
    
    return {
      threat,
      confidence,
      level: threatLevel,
      details: generateAnalysisDetails(isThreatDetected, analysis, threatLevel),
      recommendations: generateRecommendations(threatLevel, isThreatDetected),
      fullAnalysis: analysis,
      isThreatDetected,
      analysisTimestamp: new Date().toISOString(),
      filename
    };
  };

  const extractThreatLevelFromLLM = (analysis: string): 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
    const upperAnalysis = analysis.toUpperCase();
    
    // First check if it's explicitly a single word response (from your modified prompt)
    const singleWordMatch = analysis.trim().match(/^(SAFE|LOW|MEDIUM|HIGH|CRITICAL)$/i);
    if (singleWordMatch) {
      return singleWordMatch[1].toUpperCase() as 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }
    
    // Check for explicit threat level mentions
    if (upperAnalysis.includes('CRITICAL') || upperAnalysis.includes('IMMEDIATE THREAT') || upperAnalysis.includes('IMMINENT DANGER')) {
      return 'CRITICAL';
    }
    
    if (upperAnalysis.includes('HIGH THREAT') || upperAnalysis.includes('HIGH RISK') || upperAnalysis.includes('SIGNIFICANT THREAT')) {
      return 'HIGH';
    }
    
    if (upperAnalysis.includes('MEDIUM THREAT') || upperAnalysis.includes('MODERATE THREAT') || upperAnalysis.includes('MEDIUM RISK')) {
      return 'MEDIUM';
    }
    
    if (upperAnalysis.includes('LOW THREAT') || upperAnalysis.includes('LOW RISK') || upperAnalysis.includes('MINOR THREAT')) {
      return 'LOW';
    }
    
    // Look for threat indicators in the analysis
    const criticalIndicators = [
      'ARMED PERSONNEL', 'WEAPONS VISIBLE', 'IMMEDIATE DANGER', 'TERRORIST', 'BOMB', 'EXPLOSIVE'
    ];
    
    const highIndicators = [
      'MILITARY VEHICLE', 'COMBAT EQUIPMENT', 'WEAPON SYSTEM', 'TACTICAL GEAR', 'SECURITY THREAT'
    ];
    
    const mediumIndicators = [
      'SUSPICIOUS ACTIVITY', 'POTENTIAL THREAT', 'SECURITY CONCERN', 'MONITORING REQUIRED'
    ];
    
    const lowIndicators = [
      'MINOR CONCERN', 'REQUIRES ATTENTION', 'POSSIBLE ISSUE'
    ];
    
    const safeIndicators = [
      'NO THREAT', 'SAFE', 'NORMAL', 'CIVILIAN', 'HARMLESS', 'BENIGN', 'NO IMMEDIATE THREAT', 
      'LOW-LEVEL THREAT', 'APPEARS TO BE NORMAL', 'NO SECURITY THREAT'
    ];
    
    // Count indicators
    const criticalCount = criticalIndicators.filter(indicator => upperAnalysis.includes(indicator)).length;
    const highCount = highIndicators.filter(indicator => upperAnalysis.includes(indicator)).length;
    const mediumCount = mediumIndicators.filter(indicator => upperAnalysis.includes(indicator)).length;
    const lowCount = lowIndicators.filter(indicator => upperAnalysis.includes(indicator)).length;
    const safeCount = safeIndicators.filter(indicator => upperAnalysis.includes(indicator)).length;
    
    // Determine threat level based on highest count
    if (criticalCount > 0) return 'CRITICAL';
    if (highCount > 0) return 'HIGH';
    if (mediumCount > 0) return 'MEDIUM';
    if (lowCount > 0) return 'LOW';
    if (safeCount > 0) return 'SAFE';
    
    // Default assessment based on overall tone
    if (upperAnalysis.includes('THREAT') && !upperAnalysis.includes('NO THREAT')) {
      return 'MEDIUM'; // Default to medium if threat mentioned but no specific level
    }
    
    return 'SAFE'; // Default to safe if no clear indicators
  };

  const generateAnalysisDetails = (isThreatDetected: boolean, analysis: string, level: string): string => {
    if (!isThreatDetected) {
      return 'AI analysis has thoroughly examined the submitted media and determined it contains no security threats or concerning elements. The content appears to be normal civilian material with no indicators of danger.';
    }
    
    // Extract key findings from analysis
    const sentences = analysis.split(/[.!?]+/).filter(s => s.trim().length > 20);
    let keyFindings = '';
    
    // Look for sentences containing threat-related keywords
    const threatSentences = sentences.filter(sentence => {
      const upper = sentence.toUpperCase();
      return upper.includes('THREAT') || upper.includes('RISK') || upper.includes('CONCERN') || 
             upper.includes('WEAPON') || upper.includes('SUSPICIOUS') || upper.includes('DANGER');
    });
    
    if (threatSentences.length > 0) {
      keyFindings = threatSentences.slice(0, 2).join('. ').substring(0, 200) + '...';
    } else {
      keyFindings = sentences.slice(0, 2).join('. ').substring(0, 200) + '...';
    }
    
    const levelDescriptions = {
      'LOW': 'minor security concerns that warrant attention',
      'MEDIUM': 'moderate security risks requiring monitoring',
      'HIGH': 'significant security threats demanding immediate attention',
      'CRITICAL': 'severe security threats requiring emergency response'
    };
    
    return `AI analysis has identified ${levelDescriptions[level as keyof typeof levelDescriptions]} in the submitted media. ${keyFindings}`;
  };

  const generateRecommendations = (level: string, isThreatDetected: boolean): string[] => {
    if (!isThreatDetected || level === 'SAFE') {
      return [
        'Continue with standard monitoring procedures',
        'Archive analysis results for record-keeping',
        'No immediate action required',
        'Proceed with normal operations',
        'Maintain routine security protocols'
      ];
    }

    const baseRecommendations = [
      'Document findings in security logs',
      'Report to appropriate security personnel',
      'Maintain chain of custody for evidence',
      'Update threat assessment database'
    ];

    switch (level) {
      case 'CRITICAL':
        return [
          'INITIATE EMERGENCY PROTOCOLS IMMEDIATELY',
          'Alert all security personnel and command structure',
          'Establish secure perimeter around area',
          'Contact law enforcement and emergency services',
          'Evacuate non-essential personnel if required',
          'Deploy rapid response teams',
          'Activate crisis management procedures',
          ...baseRecommendations
        ];
      case 'HIGH':
        return [
          'Escalate immediately to senior security personnel',
          'Increase surveillance measures in affected areas',
          'Prepare emergency response teams for deployment',
          'Monitor situation with heightened vigilance',
          'Brief all security staff on current threat',
          'Implement enhanced security protocols',
          ...baseRecommendations
        ];
      case 'MEDIUM':
        return [
          'Increase monitoring frequency for this area',
          'Deploy additional surveillance resources',
          'Brief security team on identified concerns',
          'Review and update security protocols',
          'Conduct follow-up assessments as needed',
          ...baseRecommendations
        ];
      case 'LOW':
        return [
          'Monitor situation for any developments',
          'Review existing security protocols',
          'Maintain heightened awareness',
          'Schedule follow-up analysis if needed',
          'Brief relevant personnel on findings',
          ...baseRecommendations
        ];
      default:
        return baseRecommendations;
    }
  };

  const getThreatColorScheme = (level: string) => {
    switch (level) {
      case 'SAFE':
        return {
          primary: '#27ae60',
          secondary: '#2ecc71',
          text: '#ffffff',
          bg: 'linear-gradient(135deg, #27ae60, #2ecc71)'
        };
      case 'LOW':
        return {
          primary: '#f39c12',
          secondary: '#e67e22',
          text: '#ffffff',
          bg: 'linear-gradient(135deg, #f39c12, #e67e22)'
        };
      case 'MEDIUM':
        return {
          primary: '#e67e22',
          secondary: '#d35400',
          text: '#ffffff',
          bg: 'linear-gradient(135deg, #e67e22, #d35400)'
        };
      case 'HIGH':
        return {
          primary: '#e74c3c',
          secondary: '#c0392b',
          text: '#ffffff',
          bg: 'linear-gradient(135deg, #e74c3c, #c0392b)'
        };
      case 'CRITICAL':
        return {
          primary: '#8e44ad',
          secondary: '#9b59b6',
          text: '#ffffff',
          bg: 'linear-gradient(135deg, #8e44ad, #9b59b6)'
        };
      default:
        return {
          primary: '#3498db',
          secondary: '#2980b9',
          text: '#ffffff',
          bg: 'linear-gradient(135deg, #3498db, #2980b9)'
        };
    }
  };

  const downloadReport = () => {
    if (!result) return;

    const reportContent = isThreatResult ? 
      generateThreatPDFReport(result as ThreatResult) : 
      generateVideoPDFReport(result as VideoAnalysisResult | ImageAnalysisResult);
    
    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isThreatResult ? 
      `threat-analysis-report-${(result as ThreatResult).level.toLowerCase()}-${new Date().toISOString().split('T')[0]}.html` :
      `video-analysis-report-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateThreatPDFReport = (result: ThreatResult): string => {
    const colorScheme = getThreatColorScheme(result.level);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Threat Analysis Report - ${result.level}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background: ${colorScheme.bg};
            min-height: 100vh;
            padding: 20px;
        }
        
        .report-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            border: 3px solid ${colorScheme.primary};
        }
        
        .header {
            background: ${colorScheme.bg};
            color: ${colorScheme.text};
            padding: 40px;
            text-align: center;
            position: relative;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
            opacity: 0.3;
        }
        
        .header-content {
            position: relative;
            z-index: 1;
        }
        
        .header h1 {
            font-size: 2.8rem;
            font-weight: 800;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 3px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
            font-weight: 300;
        }
        
        .threat-level-badge {
            display: inline-block;
            padding: 15px 30px;
            border-radius: 50px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-top: 20px;
            font-size: 1.1rem;
            background: rgba(255,255,255,0.2);
            border: 2px solid rgba(255,255,255,0.3);
            backdrop-filter: blur(10px);
        }
        
        .content {
            padding: 40px;
        }
        
        .status-section {
            text-align: center;
            padding: 30px;
            margin-bottom: 30px;
            border-radius: 15px;
            background: ${result.isThreatDetected ? 
                'linear-gradient(135deg, rgba(231, 76, 60, 0.1), rgba(192, 57, 43, 0.1))' : 
                'linear-gradient(135deg, rgba(39, 174, 96, 0.1), rgba(46, 204, 113, 0.1))'
            };
            border: 2px solid ${colorScheme.primary};
        }
        
        .status-icon {
            font-size: 3rem;
            margin-bottom: 15px;
            display: block;
        }
        
        .status-text {
            font-size: 1.8rem;
            font-weight: 700;
            color: ${colorScheme.primary};
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .info-card {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 15px;
            border-left: 4px solid ${colorScheme.primary};
            text-align: center;
            transition: transform 0.3s ease;
        }
        
        .info-card:hover {
            transform: translateY(-5px);
        }
        
        .info-card h3 {
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #666;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .info-card .value {
            font-size: 1.5rem;
            font-weight: 700;
            color: ${colorScheme.primary};
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section h2 {
            font-size: 1.6rem;
            color: #2c3e50;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid ${colorScheme.primary};
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .analysis-text {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 15px;
            border-left: 4px solid ${colorScheme.primary};
            font-size: 1rem;
            line-height: 1.8;
        }
        
        .recommendations {
            list-style: none;
            padding: 0;
        }
        
        .recommendations li {
            background: white;
            padding: 15px 20px;
            margin-bottom: 10px;
            border-radius: 10px;
            border-left: 4px solid ${colorScheme.primary};
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
            font-weight: 500;
            transition: transform 0.2s ease;
        }
        
        .recommendations li:hover {
            transform: translateX(5px);
        }
        
        .recommendations li:before {
            content: "▶";
            color: ${colorScheme.primary};
            font-weight: bold;
            margin-right: 10px;
        }
        
        .confidence-bar {
            width: 100%;
            height: 12px;
            background: #e0e0e0;
            border-radius: 6px;
            overflow: hidden;
            margin-top: 10px;
            position: relative;
        }
        
        .confidence-fill {
            height: 100%;
            background: ${colorScheme.bg};
            width: ${result.confidence}%;
            border-radius: 6px;
            transition: width 0.3s ease;
        }
        
        .footer {
            background: ${colorScheme.bg};
            color: ${colorScheme.text};
            padding: 30px 40px;
            text-align: center;
            font-size: 0.9rem;
        }
        
        .timestamp {
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .disclaimer {
            opacity: 0.8;
            font-style: italic;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .report-container {
                box-shadow: none;
                border-radius: 0;
            }
            
            .info-card:hover, .recommendations li:hover {
                transform: none;
            }
        }
        
        .critical-warning {
            background: linear-gradient(45deg, #ff6b6b, #ff8e8e);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.8; }
            100% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <div class="header-content">
                <h1>Threat Analysis Report</h1>
                <div class="subtitle">AI-Powered Security Assessment System</div>
                <div class="threat-level-badge">THREAT LEVEL: ${result.level}</div>
            </div>
        </div>
        
        <div class="content">
            ${result.level === 'CRITICAL' ? '<div class="critical-warning">⚠️ CRITICAL THREAT DETECTED - IMMEDIATE ACTION REQUIRED ⚠️</div>' : ''}
            
            <div class="status-section">
                <span class="status-icon">${result.isThreatDetected ? '🚨' : '✅'}</span>
                <div class="status-text">${result.threat}</div>
                <div style="color: #666;">Analysis completed with ${result.confidence}% confidence</div>
            </div>
            
            <div class="info-grid">
                <div class="info-card">
                    <h3>Threat Level</h3>
                    <div class="value">${result.level}</div>
                </div>
                
                <div class="info-card">
                    <h3>Confidence Level</h3>
                    <div class="value">${result.confidence}%</div>
                    <div class="confidence-bar">
                        <div class="confidence-fill"></div>
                    </div>
                </div>
                
                <div class="info-card">
                    <h3>Analysis Date</h3>
                    <div class="value">${new Date(result.analysisTimestamp).toLocaleDateString()}</div>
                </div>
                
                <div class="info-card">
                    <h3>File Analyzed</h3>
                    <div class="value" style="font-size: 0.9rem; word-break: break-all;">${result.filename}</div>
                </div>
            </div>
            
            <div class="section">
                <h2>Executive Summary</h2>
                <div class="analysis-text">${result.details}</div>
            </div>
            
            <div class="section">
                <h2>Detailed AI Analysis</h2>
                <div class="analysis-text">${result.fullAnalysis}</div>
            </div>
            
            <div class="section">
                <h2>Recommended Actions</h2>
                <ul class="recommendations">
                    ${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
            <div class="disclaimer">This report was generated by AI analysis and should be reviewed by qualified security personnel. Classification: ${result.level}</div>
        </div>
    </div>
</body>
</html>`;
  };

  const generateVideoPDFReport = (result: VideoAnalysisResult | ImageAnalysisResult): string => {
    const isVideoResult = 'detection_timeline' in result;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Military ${isVideoResult ? 'Video' : 'Image'} Analysis Report</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .report-container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            border: 3px solid #667eea;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
            position: relative;
        }
        
        .header h1 {
            font-size: 2.8rem;
            font-weight: 800;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 3px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section h2 {
            font-size: 1.6rem;
            color: #2c3e50;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
            font-weight: 700;
        }
        
        .timeline-entry {
            background: #f8f9fa;
            margin-bottom: 15px;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        
        .detection-item {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 4px solid #27ae60;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <h1>Military ${isVideoResult ? 'Video' : 'Image'} Analysis</h1>
            <div class="subtitle">AI-Powered Object Detection System</div>
        </div>
        
        <div class="content">
            ${isVideoResult ? generateVideoReportContent(result as VideoAnalysisResult) : generateImageReportContent(result as ImageAnalysisResult)}
        </div>
        
        <div class="footer" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
            <div>Generated: ${new Date().toLocaleString()}</div>
            <div style="margin-top: 10px; opacity: 0.8;">Military Object Detection Analysis Report</div>
        </div>
    </div>
</body>
</html>`;
  };

  const generateVideoReportContent = (result: VideoAnalysisResult): string => {
    return `
      <div class="section">
        <h2>Analysis Summary</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px;">
          <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; text-align: center;">
            <h3>Object Types Detected</h3>
            <div style="font-size: 2rem; font-weight: bold; color: #1976d2;">${result.summary.total_object_types}</div>
          </div>
          <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; text-align: center;">
            <h3>Frames Analyzed</h3>
            <div style="font-size: 2rem; font-weight: bold; color: #388e3c;">${result.summary.total_frames_analyzed}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>First Detections</h2>
        ${Object.entries(result.first_detections).map(([type, detection]) => `
          <div class="detection-item">
            <h4 style="color: #1976d2; text-transform: uppercase;">${type}</h4>
            <p><strong>Time:</strong> ${detection.time_formatted}</p>
            <p><strong>Confidence:</strong> ${detection.confidence}%</p>
            <p><strong>Position:</strong> ${detection.position}</p>
            <p><strong>Details:</strong> ${detection.details}</p>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>Detection Timeline</h2>
        ${result.detection_timeline.slice(0, 10).map(entry => `
          <div class="timeline-entry">
            <h4>Frame ${entry.frame_number} - ${entry.time_formatted}</h4>
            ${entry.first_detections_in_frame.length > 0 ? 
              `<p style="color: #d32f2f; font-weight: bold;">🚨 New detections: ${entry.first_detections_in_frame.join(', ')}</p>` : 
              ''
            }
            <div style="margin-top: 10px; font-size: 0.9rem; color: #666;">
              ${entry.analysis.substring(0, 300)}...
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };

  const generateImageReportContent = (result: ImageAnalysisResult): string => {
    return `
      <div class="section">
        <h2>Image Information</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 10px;">
          <p><strong>Size:</strong> ${result.image_info.size[0]} x ${result.image_info.size[1]} pixels</p>
          <p><strong>Mode:</strong> ${result.image_info.mode}</p>
          <p><strong>Format:</strong> ${result.image_info.format}</p>
        </div>
      </div>
      
      <div class="section">
        <h2>Analysis Results</h2>
        <div style="background: #f8f9fa; padding: 25px; border-radius: 15px; border-left: 4px solid #667eea;">
          <pre style="white-space: pre-wrap; font-family: inherit;">${result.analysis}</pre>
        </div>
      </div>
    `;
  };

  const handleReanalyze = () => {
    setResult(null);
    setError(null);
    setProgress(0);
    setAnalysisId(null);
    setSelectedTimestamp(null);
    setLocalIsAnalyzing(true);
    
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    onAnalyze();
  };

  useEffect(() => {
    if (localIsAnalyzing && file) {
      setProgress(0);
      setError(null);
      
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= (isVideoFile ? 85 : 90)) {
            clearInterval(progressInterval);
            return isVideoFile ? 85 : 90;
          }
          return prev + (isVideoFile ? 2 : 3);
        });
      }, isVideoFile ? 200 : 150);

      analyzeFile(file);

      return () => clearInterval(progressInterval);
    }
  }, [localIsAnalyzing, file]);

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const getThreatColor = (levelOrCount: string | number) => {
    if (typeof levelOrCount === 'string') {
      switch (levelOrCount) {
        case 'SAFE':
          return 'text-green-500';
        case 'LOW':
          return 'text-yellow-500';
        case 'MEDIUM':
          return 'text-orange-500';
        case 'HIGH':
          return 'text-red-500';
        case 'CRITICAL':
          return 'text-red-700';
        default:
          return 'text-blue-500';
      }
    } else {
      const count = levelOrCount;
      if (count === 0) return 'text-green-500';
      if (count <= 2) return 'text-yellow-500';
      if (count <= 5) return 'text-orange-500';
      if (count <= 10) return 'text-red-500';
      return 'text-red-700';
    }
  };

  const getThreatIcon = (levelOrCount: string | number) => {
    if (typeof levelOrCount === 'string') {
      switch (levelOrCount) {
        case 'SAFE':
          return <CheckCircle className="w-6 h-6 text-green-500" />;
        case 'LOW':
          return <Clock className="w-6 h-6 text-yellow-500" />;
        case 'MEDIUM':
          return <AlertTriangle className="w-6 h-6 text-orange-500" />;
        case 'HIGH':
          return <AlertTriangle className="w-6 h-6 text-red-500" />;
        case 'CRITICAL':
          return <Zap className="w-6 h-6 text-red-700" />;
        default:
          return <Shield className="w-6 h-6 text-blue-500" />;
      }
    } else {
      const count = levelOrCount;
      if (count === 0) return <CheckCircle className="w-6 h-6 text-green-500" />;
      if (count <= 2) return <Clock className="w-6 h-6 text-yellow-500" />;
      if (count <= 5) return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      if (count <= 10) return <AlertTriangle className="w-6 h-6 text-red-500" />;
      return <Zap className="w-6 h-6 text-red-700" />;
    }
  };

  if (!file) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-gradient-to-br  rounded-lg p-8 text-center border border-slate-600">
          <Target className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-amber-400 mb-2">
            AWAITING TARGET DATA
          </h3>
          <p className="text-green-400">
            Upload a file to begin AI analysis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-gradient-to-br  rounded-lg p-8 border border-slate-600">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-amber-400">
            {isVideoFile ? 'VIDEO ANALYSIS' : 'IMAGE ANALYSIS'} - {isVideoFile ? 'MILITARY DETECTION' : 'THREAT ASSESSMENT'}
          </h3>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400">AI SYSTEM ONLINE</span>
          </div>
        </div>
{!localIsAnalyzing && !result && !error && (
  <div className="text-center space-y-4">
    <button
      onClick={handleReanalyze}
      className="bg-orange-500 hover:bg-orange-600 text-slate-900 font-bold px-8 py-4 text-lg rounded-lg flex items-center mx-auto"
    >
      <Zap className="w-5 h-5 mr-2" />
      INITIATE AI ANALYSIS
    </button>
    {isVideoFile && (
      <button 
        onClick={() => window.open('http://localhost:8501', '_blank')}
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-8 py-4 text-lg rounded-lg flex items-center mx-auto"
      >
        <FileVideo className="w-5 h-5 mr-2" />
        OPEN STREAMLIT DETECTION PAGE
      </button>
    )}
  </div>
)}


        {error && (
          <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-red-500 font-bold">
                ANALYSIS ERROR
              </span>
            </div>
            <p className="text-orange-400 mt-2">
              {error}
            </p>
            <button
              onClick={handleReanalyze}
              className="bg-orange-500 hover:bg-orange-600 text-slate-900 font-bold px-6 py-3 mt-4 rounded-lg"
            >
              RETRY ANALYSIS
            </button>
          </div>
        )}

        {localIsAnalyzing && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-amber-400 font-bold">
                {isVideoFile ? 'ANALYZING VIDEO FRAMES...' : 'ANALYZING IMAGE...'} {progress}%
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-orange-500 to-amber-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-green-400 text-sm">
              Processing file: {file.name}
              {analysisId && <div className="text-xs text-slate-400">Analysis ID: {analysisId}</div>}
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-6 rounded-lg border border-slate-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {isThreatResult ? 
                    getThreatIcon((result as ThreatResult).level) : 
                    getThreatIcon(totalDetections)}
                  <div>
                    <h4 className={`text-xl font-bold ${
                      isThreatResult ? 
                        getThreatColor((result as ThreatResult).level) : 
                        getThreatColor(totalDetections)
                    }`}>
                      {isThreatResult ? 
                        (result as ThreatResult).threat : 
                        `${totalDetections} OBJECT TYPES DETECTED`}
                    </h4>
                    <p className="text-slate-400">
                      {isThreatResult ? 
                        `Analysis completed with ${(result as ThreatResult).confidence}% confidence` : 
                        (isVideoFile ? 'Video Processing Complete' : 'Static Image Analysis')}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={downloadReport}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    EXPORT REPORT
                  </button>
                  <button
                    onClick={handleReanalyze}
                    className="bg-orange-500 hover:bg-orange-600 text-slate-900 font-bold px-4 py-2 rounded-lg"
                  >
                    RE-ANALYZE
                  </button>
                </div>
              </div>

              {isThreatResult ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-900 p-4 rounded-lg">
                      <div className="text-slate-400 text-sm">THREAT LEVEL</div>
                      <div className={`text-lg font-bold ${getThreatColor((result as ThreatResult).level)}`}>
                        {(result as ThreatResult).level}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-lg">
                      <div className="text-slate-400 text-sm">ANALYSIS TIME</div>
                      <div className="text-green-400 text-lg font-bold">
                        {new Date((result as ThreatResult).analysisTimestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-lg">
                      <div className="text-slate-400 text-sm">FILE STATUS</div>
                      <div className="text-amber-400 text-lg font-bold">
                        PROCESSED
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h5 className="text-amber-400 font-bold mb-2">ANALYSIS SUMMARY</h5>
                      <p className="text-slate-300 bg-slate-800 p-4 rounded-lg">
                        {(result as ThreatResult).details}
                      </p>
                    </div>

                    <div>   
                      <h5 className="text-amber-400 font-bold mb-2">Threat Level</h5>
                      <div className="text-slate-300 bg-slate-800 p-4 rounded-lg max-h-48 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm">
                          {(result as ThreatResult).fullAnalysis}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-amber-400 font-bold mb-2">RECOMMENDED ACTIONS</h5>
                      <div className="space-y-2">
                        {(result as ThreatResult).recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start space-x-2 bg-slate-800 p-3 rounded-lg">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              (result as ThreatResult).level === 'CRITICAL' ? 'bg-red-500' :
                              (result as ThreatResult).level === 'HIGH' ? 'bg-orange-500' :
                              (result as ThreatResult).level === 'MEDIUM' ? 'bg-yellow-500' :
                              (result as ThreatResult).level === 'LOW' ? 'bg-blue-500' :
                              'bg-green-500'
                            }`} />
                            <span className="text-slate-300 text-sm">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {(result as ThreatResult).level === 'CRITICAL' && (
                    <div className="bg-red-500/20 border border-red-500 p-4 rounded-lg animate-pulse mt-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                        <span className="text-red-500 font-bold text-lg">
                          CRITICAL THREAT DETECTED
                        </span>
                      </div>
                      <p className="text-red-400 mt-2">
                        Immediate action required. Contact security personnel immediately.
                      </p>
                    </div>
                  )}
                </>
              ) : isVideoResult ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-900 p-4 rounded-lg">
                      <div className="text-slate-400 text-sm">OBJECT TYPES</div>
                      <div className={`text-lg font-bold ${getThreatColor(totalDetections)}`}>
                        {totalDetections}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-lg">
                      <div className="text-slate-400 text-sm">FRAMES ANALYZED</div>
                      <div className="text-green-400 text-lg font-bold">
                        {(result as VideoAnalysisResult).summary.total_frames_analyzed}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-lg">
                      <div className="text-slate-400 text-sm">ANALYSIS ID</div>
                      <div className="text-amber-400 text-sm font-mono">
                        {(result as VideoAnalysisResult).analysis_id.substring(0, 8)}...
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h5 className="text-amber-400 font-bold mb-2">FIRST DETECTIONS</h5>
                      <div className="space-y-2">
                        {Object.entries((result as VideoAnalysisResult).first_detections).map(([type, detection]) => (
                          <div key={type} className=" p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-green-400 font-bold text-lg uppercase">{type}</div>
                                <div className="text-slate-300 text-sm">
                                  First detected at {detection.time_formatted}
                                </div>
                                <div className="text-slate-400 text-xs mt-1">
                                  Confidence: {detection.confidence}% | Position: {detection.position}
                                </div>
                              </div>
                              <button
                                onClick={() => setSelectedTimestamp(detection.timestamp)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                              >
                                VIEW
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedTimestamp !== null && (
                      <div>
                        <h5 className="text-amber-400 font-bold mb-2">TIMELINE DETAILS</h5>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {(result as VideoAnalysisResult).detection_timeline
                            .filter(entry => Math.abs(entry.timestamp - selectedTimestamp) < 2)
                            .map((entry, index) => (
                            <div key={index} className="bg-slate-800 p-3 rounded-lg">
                              <div className="text-green-400 font-bold text-sm">
                                Frame {entry.frame_number} - {entry.time_formatted}
                              </div>
                              {entry.first_detections_in_frame.length > 0 && (
                                <div className="text-orange-400 text-sm mt-1">
                                  🚨 New: {entry.first_detections_in_frame.join(', ')}
                                </div>
                              )}
                              <div className="text-slate-300 text-xs mt-2 max-h-20 overflow-y-auto">
                                {entry.analysis.substring(0, 200)}...
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {totalDetections > 10 && (
                    <div className="bg-red-500/20 border border-red-500 p-4 rounded-lg animate-pulse mt-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                        <span className="text-red-500 font-bold text-lg">
                          HIGH ACTIVITY DETECTED
                        </span>
                      </div>
                      <p className="text-red-400 mt-2">
                        Multiple object types detected. Review detailed analysis and consider escalation.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <h5 className="text-amber-400 font-bold mb-2">ANALYSIS RESULTS</h5>
                  <div className="text-slate-300 bg-slate-800 p-4 rounded-lg max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm">
                      {(result as ImageAnalysisResult).analysis}
                    </pre>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
                    <div className="bg-slate-800 p-2 rounded">
                      <div className="text-slate-400">SIZE</div>
                      <div className="text-green-400">{(result as ImageAnalysisResult).image_info.size.join(' × ')}</div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded">
                      <div className="text-slate-400">MODE</div>
                      <div className="text-green-400">{(result as ImageAnalysisResult).image_info.mode}</div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded">
                      <div className="text-slate-400">FORMAT</div>
                      <div className="text-green-400">{(result as ImageAnalysisResult).image_info.format}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileAnalysis;