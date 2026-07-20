import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiCpu, FiMessageSquare, FiTrendingDown, FiAlertTriangle, FiBook } from 'react-icons/fi';
import api from '../../services/api.js';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
  { text: 'Which students are currently at-risk?', icon: FiAlertTriangle, color: 'text-red-400' },
  { text: 'What is the attendance trend for B.Tech CS?', icon: FiTrendingDown, color: 'text-indigo-400' },
  { text: 'Analyze low Friday attendance rates', icon: FiBook, color: 'text-amber-400' },
];

function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Hello! I am your AMS AI Assistant. You can query any statistical attendance reports, search at-risk students, or ask me to draft warning notifications.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const prompt = textToSend || input;
    if (!prompt.trim()) return;

    if (!textToSend) setInput('');

    // Append user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: prompt,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        content: m.text
      }));
      const res = await api.post('/ai/chat', { message: prompt, history });
      const data = res.data?.data || res.data;
      const aiText = data?.content || data?.response || (typeof data === 'string' ? data : 'Understood.');

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: aiText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('AI API error:', err);
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: "I'm unable to connect to the AI assistant server right now. Please check your backend connection or try again later.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-4">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
          <FiCpu className="text-white text-xl animate-spin-slow" />
        </div>
        <div>
          <h1 className="text-xl font-black text-[var(--text)]">AMS Cognitive Assistant</h1>
          <p className="text-xs text-[var(--text-muted)]">Ask questions, generate alerts, or compose notifications using LLM intelligence</p>
        </div>
      </div>

      {/* Main chat window */}
      <div className="flex-1 glass-card rounded-3xl p-4 flex flex-col justify-between overflow-hidden">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scroll-smooth">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[75%] ${
                msg.sender === 'user' ? 'chat-bubble-user ml-auto' : 'chat-bubble-ai mr-auto'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <span className="text-[10px] self-end mt-1 opacity-70 font-semibold">{msg.time}</span>
            </div>
          ))}

          {loading && (
            <div className="chat-bubble-ai mr-auto flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestion prompts */}
        {messages.length === 1 && !loading && (
          <div className="px-2 py-3 border-t border-[var(--border)]">
            <p className="text-xs font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-2">Suggested Queries</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s.text)}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-full hover:border-indigo-400"
                >
                  <s.icon className={s.color} size={13} />
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input box */}
        <div className="flex items-center gap-2 border-t border-[var(--border)] pt-3">
          <input
            type="text"
            className="input-field py-2.5 pl-4 pr-12 text-sm"
            placeholder="Ask AI anything about the attendance metrics..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="btn-primary p-3 rounded-xl flex-shrink-0"
          >
            <FiSend size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIAssistant;
