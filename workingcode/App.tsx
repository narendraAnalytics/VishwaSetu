
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decode, decodeAudioData, createBlob } from './services/audioUtils';
import { SYSTEM_INSTRUCTION } from './constants';
import { Message, GroundingSource } from './types';
import { askKnowledgeHub } from './services/geminiService';

const App: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInputText, setCurrentInputText] = useState('');
  const [currentOutputText, setCurrentOutputText] = useState('');
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(false);
  const [knowledgeResult, setKnowledgeResult] = useState<{ text: string, sources: GroundingSource[] } | null>(null);
  const [knowledgeQuery, setKnowledgeQuery] = useState('');

  // Refs for persistent state across renders and async callbacks
  const isActiveRef = useRef(false);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);

  const addMessage = useCallback((role: 'user' | 'vishwa', text: string) => {
    setMessages(prev => [...prev, { role, text, timestamp: new Date() }]);
  }, []);

  const stopSession = useCallback(() => {
    console.log("Stopping VishwaSetu Session...");
    setIsActive(false);
    isActiveRef.current = false;
    
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.onaudioprocess = null;
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close().catch(() => {});
      inputAudioContextRef.current = null;
    }

    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close().catch(() => {});
      outputAudioContextRef.current = null;
    }

    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }

    nextStartTimeRef.current = 0;
    setCurrentInputText('');
    setCurrentOutputText('');
  }, []);

  const startSession = async () => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        alert("API Key is missing. Please ensure process.env.API_KEY is set.");
        return;
      }

      if (isActiveRef.current) stopSession();

      console.log("Initializing VishwaSetu Session...");
      const ai = new GoogleGenAI({ apiKey });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Crucial: Resume contexts to satisfy browser security/power policies
      await inputCtx.resume();
      await outputCtx.resume();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live: WebSocket Connection Established');
            setIsActive(true);
            isActiveRef.current = true;

            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              if (isActiveRef.current) {
                // Keep context alive
                if (inputCtx.state === 'suspended') inputCtx.resume();
                
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                
                sessionPromise.then(session => {
                  sessionRef.current = session;
                  try {
                    session.sendRealtimeInput({ media: pcmBlob });
                  } catch (err) {
                    console.error("Transmission Error:", err);
                  }
                }).catch(err => {
                  console.error("Session Promise Error:", err);
                });
              }
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
            
            // Initial nudge to trigger model response
            sessionPromise.then(session => {
              session.sendRealtimeInput({ media: createBlob(new Float32Array(1600).fill(0)) });
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              if (ctx.state === 'suspended') await ctx.resume();
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.inputTranscription) {
              setCurrentInputText(prev => prev + message.serverContent!.inputTranscription!.text);
            }
            if (message.serverContent?.outputTranscription) {
              setCurrentOutputText(prev => prev + message.serverContent!.outputTranscription!.text);
            }

            if (message.serverContent?.turnComplete) {
              setCurrentInputText(prev => {
                if (prev.trim()) addMessage('user', prev);
                return '';
              });
              setCurrentOutputText(prev => {
                if (prev.trim()) addMessage('vishwa', prev);
                return '';
              });
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Gemini Live Callback Error:', e);
          },
          onclose: (e) => {
            console.warn('Gemini Live: WebSocket Closed', e);
            if (isActiveRef.current) {
              stopSession();
            }
          },
        },
      });
    } catch (err) {
      console.error('Session Start Failure:', err);
      alert('Failed to connect to teacher. Check your internet and API key.');
      stopSession();
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  const handleKnowledgeSearch = async () => {
    if (!knowledgeQuery.trim()) return;
    setIsKnowledgeLoading(true);
    const result = await askKnowledgeHub(knowledgeQuery);
    setKnowledgeResult(result);
    setIsKnowledgeLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen max-w-5xl mx-auto px-4 py-8 gap-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm earthy-card">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="bg-orange-500 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl shadow-lg">
            <i className="fa-solid fa-earth-asia"></i>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">VishwaSetu</h1>
            <p className="text-orange-600 font-medium">Your Village's Bridge to the World</p>
          </div>
        </div>
        <button
          onClick={isActive ? stopSession : startSession}
          className={`px-8 py-3 rounded-full font-bold text-lg transition-all flex items-center gap-2 shadow-md ${
            isActive 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-orange-600 hover:bg-orange-700 text-white'
          }`}
        >
          {isActive ? (
            <><i className="fa-solid fa-stop"></i> Stop Class</>
          ) : (
            <><i className="fa-solid fa-microphone"></i> Start Learning</>
          )}
        </button>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
        {/* Interaction Pane */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col h-[500px] earthy-card relative">
            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-chalkboard-user text-orange-500"></i> Live Classroom
            </h2>
            
            <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar flex flex-col">
              {messages.length === 0 && !isActive && (
                <div className="flex justify-center items-center h-full text-center p-8 text-gray-400">
                  <div className="max-w-xs">
                    <i className="fa-solid fa-microphone-lines text-4xl mb-4 block opacity-20"></i>
                    <p className="text-lg">Namaste! Click "Start Learning" to talk with your wise teacher, VishwaSetu.</p>
                    <p className="text-sm mt-4 text-orange-400 italic">"Learning a new tongue is like opening a new window to the world."</p>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-orange-50 text-gray-800 rounded-tr-none border-l-4 border-orange-500' 
                      : 'bg-gray-50 text-gray-800 rounded-tl-none border-r-4 border-gray-400'
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                        {msg.role === 'user' ? 'Student' : 'VishwaSetu'}
                      </p>
                    </div>
                    <p className="text-lg leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              
              {currentInputText && (
                <div className="flex justify-end opacity-60">
                  <div className="bg-orange-100/50 p-3 rounded-2xl border-l-4 border-orange-300">
                    <p className="text-xs uppercase font-bold opacity-40 mb-1">Listening...</p>
                    {currentInputText}
                  </div>
                </div>
              )}
              {currentOutputText && (
                <div className="flex justify-start opacity-60">
                  <div className="bg-gray-100/50 p-3 rounded-2xl border-r-4 border-gray-300">
                    <p className="text-xs uppercase font-bold opacity-40 mb-1">Speaking...</p>
                    {currentOutputText}
                  </div>
                </div>
              )}
              <div id="anchor" className="h-2"></div>
            </div>

            {isActive && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white px-6 py-2 rounded-full shadow-lg border border-orange-100">
                <div className="pulse-ring w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-orange-600 font-bold text-sm tracking-wide uppercase">Teacher is Listening</span>
              </div>
            )}
          </div>
        </section>

        {/* Knowledge Hub Sidebar */}
        <aside className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 earthy-card">
            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-book-open text-orange-500"></i> Cultural Hub
            </h2>
            <p className="text-sm text-gray-600 mb-4 italic">
              "To know a language, you must also know the hearts of the people who speak it."
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Ask about culture, food, or customs..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50/50"
                value={knowledgeQuery}
                onChange={(e) => setKnowledgeQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleKnowledgeSearch()}
              />
              <button
                onClick={handleKnowledgeSearch}
                disabled={isKnowledgeLoading}
                className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-gray-900 disabled:opacity-50 transition-all shadow-md"
              >
                {isKnowledgeLoading ? 'Consulting scrolls...' : 'Search Library'}
              </button>
            </div>

            {knowledgeResult && (
              <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-lightbulb"></i> Wisdom Shared:
                </h3>
                <p className="text-sm text-gray-800 mb-4 leading-relaxed">
                  {knowledgeResult.text}
                </p>
                {knowledgeResult.sources.length > 0 && (
                  <div className="pt-3 border-t border-orange-200">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Paths to more knowledge:</p>
                    <div className="flex flex-wrap gap-2">
                      {knowledgeResult.sources.map((src, i) => (
                        <a 
                          key={i} 
                          href={src.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block text-[10px] bg-white border border-orange-200 px-2 py-1 rounded-md text-orange-600 hover:bg-orange-600 hover:text-white transition-colors max-w-full truncate"
                          title={src.title}
                        >
                          {src.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -mr-12 -mt-12"></div>
            <h3 className="font-bold mb-4 flex items-center gap-2 relative z-10">
              <i className="fa-solid fa-scroll text-yellow-400"></i> Your Journey
            </h3>
            <ul className="space-y-4 text-sm relative z-10">
              {[
                { label: 'Set Native Language', done: messages.length > 0 },
                { label: 'Pick Target Language', done: messages.length > 2 },
                { label: 'Learn Survival Phrases', done: false },
                { label: 'Job-Specific Training', done: false },
                { label: 'Roleplay Ready', done: false }
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  {item.done ? (
                    <i className="fa-solid fa-circle-check text-green-400 text-lg"></i>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center text-[10px] font-bold text-gray-500">
                      {idx + 1}
                    </div>
                  )}
                  <span className={item.done ? 'text-white font-medium' : 'text-gray-400'}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>

      {/* Footer Instructions */}
      <footer className="text-center text-gray-500 text-xs mt-auto pb-4 pt-8 border-t border-orange-100">
        <p>&copy; 2024 VishwaSetu Project. Teaching the world one village at a time.</p>
        <p className="mt-2 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          System Online & Active
        </p>
      </footer>
    </div>
  );
};

export default App;
