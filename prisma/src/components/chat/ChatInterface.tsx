'use client';

import { useState, useRef, useEffect } from 'react';
import { MoodMode } from '@prisma/client';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
}

export default function ChatInterface({ character }: { character: any }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'assistant', content: character.greeting },
  ]);
  const [input, setInput] = useState('');
  const [mood, setMood] = useState<MoodMode>('NORMAL');
  const [isGenerating, setIsGenerating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userText = input;
    setInput('');
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantMsgId, sender: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: character.id, message: userText, mood }),
      });

      if (!response.ok) {
        const err = await response.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: `[Error: ${err.error || 'Failed to stream response.'}]` }
              : m
          )
        );
        setIsGenerating(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      let completeText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              completeText += parsed.text;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, content: completeText } : m))
              );
            } catch (e) {
              // Handle partial JSON parsing edge cases safely
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-dark-bg border-x border-dark-border text-white">
      {/* Header */}
      <div className="p-4 bg-dark-card border-b border-dark-border flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src={character.avatar} alt={character.name} className="w-10 h-10 rounded-full border border-neon-purple" />
          <div>
            <h3 className="font-bold text-sm">{character.name}</h3>
            <span className="text-xs text-green-400">● Online</span>
          </div>
        </div>

        {/* Mood Mode Selector */}
        <div className="flex bg-dark-bg p-1 rounded-lg border border-dark-border">
          {(['NORMAL', 'ROMANTIC', 'ADULT'] as MoodMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMood(m)}
              className={`px-3 py-1 text-xs rounded-md font-semibold transition ${
                mood === m
                  ? m === 'ADULT'
                    ? 'bg-red-600 text-white'
                    : 'bg-gradient-to-r from-neon-purple to-neon-pink text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-tr-none'
                  : 'bg-dark-card border border-dark-border text-gray-200 rounded-tl-none shadow-md'
              }`}
            >
              {m.content || (isGenerating && <span className="animate-pulse">Typing...</span>)}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-dark-card border-t border-dark-border flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Chat with ${character.name}...`}
          className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple text-white"
        />
        <button
          onClick={handleSend}
          disabled={isGenerating}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
