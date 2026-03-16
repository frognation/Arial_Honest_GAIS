import React, { useState, useEffect, useRef, useCallback } from 'react';
import Counter from './components/Counter';
import Subtitle from './components/Subtitle';
import { transformSentence } from './services/textTransformer';
import { TextSegment } from './types';

// Define SpeechRecognition types as they are not standard in all TS envs yet
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    AudioContext: any;
    webkitAudioContext: any;
  }
}

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // App State
  const [accumulatedCount, setAccumulatedCount] = useState(0); 
  const [currentUtteranceCount, setCurrentUtteranceCount] = useState(0); 
  
  const [currentSegments, setCurrentSegments] = useState<TextSegment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [recognitionStatus, setRecognitionStatus] = useState<string>('Initializing...');
  
  // Audio Visualization State
  const [audioLevel, setAudioLevel] = useState(0);

  // Web Speech API Refs
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Helper to cleanup media streams and audio contexts
  const stopMedia = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const startMedia = useCallback(async () => {
    stopMedia(); // Ensure clean slate
    setPermissionError(null);

    const setupAudioVisualizer = (stream: MediaStream) => {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      try {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;

        microphone.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);
        
        audioContextRef.current = audioContext;

        const updateAudioLevel = () => {
          if (!analyser) return;
          const array = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(array);
          
          let values = 0;
          const length = array.length;
          for (let i = 0; i < length; i++) {
            values += array[i];
          }
          const average = values / length;
          setAudioLevel(Math.min(100, average * 2.5));
          
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        };
        
        updateAudioLevel();
      } catch (e) {
        console.error("Failed to setup audio visualizer", e);
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: "user" }, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setupAudioVisualizer(stream);

    } catch (err) {
      console.warn("Audio+Video permission failed, trying Video only...", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720, facingMode: "user" }, 
          audio: false 
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (videoErr) {
        setPermissionError("Camera access denied. Please allow camera permissions.");
      }
    }
  }, [stopMedia]);

  // Initial Mount
  useEffect(() => {
    startMedia();
    return () => stopMedia();
  }, [startMedia, stopMedia]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setPermissionError(prev => prev || "Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setRecognitionStatus('Listening...');
    };

    let restartDelay = 300;

    recognition.onend = () => {
      setIsListening(false);
      setRecognitionStatus('Stopped');
      if (shouldListenRef.current) {
        setRecognitionStatus('Restarting...');
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            // ignore if already started
          }
        }, restartDelay);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error", event.error);
      if (event.error === 'not-allowed') {
        shouldListenRef.current = false;
        setIsListening(false);
        setRecognitionStatus('Permission Denied');
      } else if (event.error === 'aborted') {
        // Increase delay on repeated aborts to avoid tight loop
        restartDelay = Math.min(restartDelay * 2, 5000);
        setRecognitionStatus('Restarting after abort...');
      } else if (event.error === 'no-speech') {
        restartDelay = 300; // Reset delay on normal no-speech
        setRecognitionStatus('No speech detected');
      } else {
        setRecognitionStatus(`Error: ${event.error}`);
      }
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscriptChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptChunk += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscriptChunk) {
        const transformedFinal = transformSentence(finalTranscriptChunk);
        setAccumulatedCount(prev => prev + transformedFinal.profanityCountAdded);
        setCurrentUtteranceCount(0);
        setCurrentSegments(transformedFinal.segments);
      }

      if (interimTranscript) {
        const transformedInterim = transformSentence(interimTranscript);
        setCurrentUtteranceCount(transformedInterim.profanityCountAdded);
        setCurrentSegments(transformedInterim.segments);
      }
    };

    recognitionRef.current = recognition;
    shouldListenRef.current = true;
    
    try {
      recognition.start();
    } catch (e) {
      // Already started
    }

    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      shouldListenRef.current = false;
      recognitionRef.current.stop();
    } else {
      shouldListenRef.current = true;
      recognitionRef.current.start();
    }
  };

  const totalDisplayCount = accumulatedCount + currentUtteranceCount;

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col items-center justify-center">
      
      {/* UI: Counter */}
      <Counter count={totalDisplayCount} />

      {/* UI: Webcam Container */}
      <div className="relative w-[80%] aspect-video border border-gray-900 shadow-2xl bg-gray-900 overflow-hidden">
        {permissionError ? (
          <div className="flex flex-col items-center justify-center h-full text-white text-center p-4 gap-4">
            <p>{permissionError}</p>
            <button 
              onClick={startMedia}
              className="px-4 py-2 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors"
            >
              Retry Camera
            </button>
          </div>
        ) : (
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover transform scale-x-[-1]" 
          />
        )}
      </div>

      {/* UI: Subtitle Layer */}
      <Subtitle segments={currentSegments} />

      {/* Controls / Status */}
      <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
            {/* Audio Visualizer Bar */}
            <div className="flex items-end justify-center h-8 w-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
                className="w-full bg-green-500 transition-all duration-75 ease-out rounded-full"
                style={{ height: `${Math.max(10, audioLevel)}%` }} 
            />
            </div>

            <button 
            onClick={toggleListening}
            className={`px-4 py-2 rounded font-bold text-xs uppercase tracking-widest ${isListening ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400'}`}
            >
            {isListening ? 'Mic On' : 'Mic Off'}
            </button>
        </div>
        {/* Debug Status */}
        <div className="text-[10px] text-gray-500 font-mono">
           STT: {recognitionStatus}
        </div>
      </div>
      
      {/* Info */}
      <div className="absolute top-4 left-4 z-50">
        <h1 className="text-white font-sans font-bold text-xl tracking-tighter opacity-50">Arial Honest</h1>
      </div>

    </div>
  );
};

export default App;