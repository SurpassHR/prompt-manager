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
  Settings,
  FileText,
  FolderOpen,
  Folder,
} from 'lucide-react';
import { ItemType, ItemMetadata } from '../types';

// 根据名称和类型返回对应图标
export const getIconForName = (name: string, type: ItemType, size: number = 16, metadata?: ItemMetadata) => {
  // 设置图标
  if (type === 'settings') {
    return <Settings size={size} className="text-[var(--text-secondary)]" />;
  }

  // 文件夹图标
  if (type === 'folder') {
    return <Folder size={size} className="text-yellow-500" />;
  }

  // 提示词图标：基于 metadata.provider 选择品牌图标
  if (type === 'prompt') {
    const provider = metadata?.provider?.toLowerCase() || '';

    if (provider.includes('openai') || provider.includes('chatgpt')) return <Bot size={size} className="text-green-400" />;
    if (provider.includes('google') || provider.includes('gemini')) return <Sparkles size={size} className="text-blue-400" />;
    if (provider.includes('anthropic') || provider.includes('claude')) return <BrainCircuit size={size} className="text-orange-400" />;
    if (provider.includes('deepseek')) return <Code2 size={size} className="text-purple-400" />;
    if (provider.includes('meta') || provider.includes('llama')) return <Cpu size={size} className="text-blue-600" />;
    if (provider.includes('mistral')) return <Zap size={size} className="text-yellow-400" />;

    // 无 provider 时使用通用 prompt 图标
    return <FileText size={size} className="text-slate-400" />;
  }

  return <Box size={size} />;
};