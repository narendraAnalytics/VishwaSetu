
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

  // Refs for audio and session
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const addMessage = useCallback((role: 'user' | 'vishwa', text: string) => {
    setMessages(prev => [...prev, { role, text, timestamp: new Date() }]);
  }, []);

  const stopSession = () => {
    setIsActive(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
    }
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    sessionPromiseRef.current = null;
    nextStartTimeRef.current = 0;
  };

  const startSession = async () => {
    try {
      setMessages([]); // Clear previous messages for a fresh start
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

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
            console.log('Session Opened');
            const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
            scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
            
            // Send a tiny silent nudge to trigger the AI to start speaking its intro based on system instructions
            sessionPromise.then(session => {
              const nudge = new Float32Array(1600).fill(0);
              session.sendRealtimeInput({ media: createBlob(nudge) });
            });

            setIsActive(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Audio data
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
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

            // Transcriptions
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setCurrentInputText(prev => prev + text);
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setCurrentOutputText(prev => prev + text);
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
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => console.error('Gemini Live Error:', e),
          onclose: () => stopSession(),
        },
      });

      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      console.error('Failed to start session:', err);
      alert('Could not access microphone or start session.');
    }
  };

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
              ? 'bg-red-500 hover:bg-red-600 text-white' 
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
              <i className="fa-solid fa-chalkboard-user text-orange-500"></i> Classroom
            </h2>
            
            <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {messages.length === 0 && !isActive && (
                <div className="flex justify-center items-center h-full text-center p-8 text-gray-400">
                  <div>
                    <i className="fa-solid fa-microphone-lines text-4xl mb-4 block opacity-20"></i>
                    <p>Click "Start Learning" to begin your lesson with VishwaSetu.</p>
                    <p className="text-xs mt-2 uppercase tracking-widest font-bold text-gray-300">Wise & Patient Teacher</p>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-orange-50 text-gray-800 rounded-tr-none border-l-4 border-orange-500' 
                      : 'bg-gray-50 text-gray-800 rounded-tl-none border-r-4 border-gray-400'
                  }`}>
                    <p className="text-sm font-bold uppercase tracking-wider mb-1 opacity-60">
                      {msg.role === 'user' ? 'You' : 'VishwaSetu'}
                    </p>
                    <p className="text-lg leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}
              
              {/* Real-time streams */}
              {currentInputText && (
                <div className="flex justify-end opacity-70 italic">
                  <div className="bg-orange-50 p-3 rounded-2xl border-l-4 border-orange-300">
                    {currentInputText}...
                  </div>
                </div>
              )}
              {currentOutputText && (
                <div className="flex justify-start opacity-70 italic">
                  <div className="bg-gray-50 p-3 rounded-2xl border-r-4 border-gray-300">
                    VishwaSetu is speaking...
                  </div>
                </div>
              )}
            </div>

            {isActive && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
                <div className="pulse-ring w-4 h-4 bg-orange-500 rounded-full"></div>
                <span className="text-orange-600 font-bold bg-white/80 px-2 py-1 rounded shadow-sm">Listening...</span>
              </div>
            )}
          </div>
        </section>

        {/* Knowledge Hub Sidebar */}
        <aside className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 earthy-card">
            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-book-open text-orange-500"></i> Knowledge Hub
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Ask about the history or culture of the languages you're learning!
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="e.g. Tell me about French food"
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={knowledgeQuery}
                onChange={(e) => setKnowledgeQuery(e.target.value)}
              />
              <button
                onClick={handleKnowledgeSearch}
                disabled={isKnowledgeLoading}
                className="w-full bg-gray-800 text-white py-2 rounded-xl font-bold hover:bg-gray-900 disabled:opacity-50 transition-all"
              >
                {isKnowledgeLoading ? 'Searching...' : 'Ask Knowledge Hub'}
              </button>
            </div>

            {knowledgeResult && (
              <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100 overflow-hidden">
                <h3 className="font-bold text-orange-800 mb-2">Discovery:</h3>
                <p className="text-sm text-gray-800 mb-4 leading-relaxed line-clamp-6 hover:line-clamp-none cursor-pointer">
                  {knowledgeResult.text}
                </p>
                {knowledgeResult.sources.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Sources:</p>
                    {knowledgeResult.sources.map((src, i) => (
                      <a 
                        key={i} 
                        href={src.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block text-xs text-orange-600 hover:underline truncate"
                      >
                        {src.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-2xl p-6 text-white shadow-xl">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <i className="fa-solid fa-star text-yellow-400"></i> Learning Goals
            </h3>
            <ul className="space-y-3 text-sm opacity-90">
              <li className="flex items-center gap-2">
                <i className="fa-solid fa-check-circle text-green-400"></i> Set Native Language
              </li>
              <li className="flex items-center gap-2">
                <i className="fa-solid fa-check-circle text-green-400"></i> Pick Target Language
              </li>
              <li className="flex items-center gap-2">
                <i className="fa-solid fa-circle text-gray-500"></i> Basic Greetings
              </li>
              <li className="flex items-center gap-2">
                <i className="fa-solid fa-circle text-gray-500"></i> Daily Needs (Water, Food)
              </li>
            </ul>
          </div>
        </aside>
      </main>

      {/* Footer Instructions */}
      <footer className="text-center text-gray-500 text-sm mt-auto pb-4">
        <p>&copy; 2024 VishwaSetu. Connecting villages through wisdom and words.</p>
        <p className="mt-1">Powered by Gemini 2.5 Live & Gemini 3 Search Grounding</p>
      </footer>
    </div>
  );
};

export default App;
