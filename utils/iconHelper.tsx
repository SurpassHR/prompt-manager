import React from 'react';
import { 
  Box, 
  Cpu, 
  Layers, 
  Bot, 
  Sparkles, 
  Zap,
  Code2,
  BrainCircuit,
  Terminal,
  MessageSquare,
  Settings
} from 'lucide-react';
import { ItemType } from '../types';

// Returns a component based on the name string for auto-matching
export const getIconForName = (name: string, type: ItemType, size: number = 16) => {
  const n = name.toLowerCase();

  // Settings Icon
  if (type === 'settings') {
    return <Settings size={size} className="text-[var(--text-secondary)]" />;
  }

  // Provider Icons
  if (type === 'provider') {
    if (n.includes('openai') || n.includes('chatgpt')) return <Bot size={size} className="text-green-400" />;
    if (n.includes('google') || n.includes('gemini')) return <Sparkles size={size} className="text-blue-400" />;
    if (n.includes('anthropic') || n.includes('claude')) return <BrainCircuit size={size} className="text-orange-400" />;
    if (n.includes('deepseek')) return <Code2 size={size} className="text-purple-400" />;
    if (n.includes('meta') || n.includes('llama')) return <Cpu size={size} className="text-blue-600" />;
    if (n.includes('mistral')) return <Zap size={size} className="text-yellow-400" />;
    return <Box size={size} className="text-slate-400" />;
  }

  // Model Icons
  if (type === 'model') {
    if (n.includes('gpt')) return <MessageSquare size={size} className="text-green-300" />;
    if (n.includes('gemini')) return <Sparkles size={size} className="text-blue-300" />;
    if (n.includes('coder')) return <Terminal size={size} className="text-purple-300" />;
    return <Layers size={size} className="text-slate-500" />;
  }

  // Version/Prompt Icons
  if (type === 'version' || type === 'prompt') return <div className="w-2 h-2 rounded-full bg-slate-500 ml-1" />;

  return <Box size={size} />;
};