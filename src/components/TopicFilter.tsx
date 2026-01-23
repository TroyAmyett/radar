'use client';

import { useMemo } from 'react';
import { Topic } from '@/types/database';
import {
  LucideProps,
  LayoutGrid,
  // AI/Tech
  Sparkles, Bot, Brain, Cpu, Zap,
  // Business
  Users, Building, Briefcase, Handshake,
  // Development
  Code, Terminal, Database, Server,
  // Web/Network
  Globe, Link as LinkIcon, Rss, Wifi,
  // Media
  Play, Video, Mic, Headphones,
  // Analytics
  TrendingUp, BarChart, Target,
  // Security
  Shield, Lock, Key, Eye,
  // Cloud/General
  Cloud, Rocket, Star,
  // Finance
  DollarSign, CreditCard, Coins, Wallet,
  // Communication
  MessageCircle, Mail, Bell, Megaphone,
} from 'lucide-react';

interface TopicFilterProps {
  topics: Topic[];
  selectedTopics: string[];
  excludedTopics?: string[];
  isAllMode?: boolean;
  onSelectTopic: (topicSlug: string | null) => void;
  onToggleColor?: (color: string) => void;
}

// Map icon names to components
const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  // AI/Tech
  'sparkles': Sparkles,
  'bot': Bot,
  'brain': Brain,
  'cpu': Cpu,
  'zap': Zap,
  // Business
  'users': Users,
  'building': Building,
  'briefcase': Briefcase,
  'handshake': Handshake,
  // Development
  'code': Code,
  'terminal': Terminal,
  'database': Database,
  'server': Server,
  // Web/Network
  'globe': Globe,
  'link': LinkIcon,
  'rss': Rss,
  'wifi': Wifi,
  // Media
  'play': Play,
  'video': Video,
  'mic': Mic,
  'headphones': Headphones,
  // Analytics
  'chart-line': TrendingUp,
  'trending-up': TrendingUp,
  'bar-chart': BarChart,
  'target': Target,
  // Security
  'shield': Shield,
  'lock': Lock,
  'key': Key,
  'eye': Eye,
  // Cloud/General
  'cloud': Cloud,
  'rocket': Rocket,
  'star': Star,
  'lightning-bolt': Zap,
  // Finance
  'dollar-sign': DollarSign,
  'credit-card': CreditCard,
  'coins': Coins,
  'wallet': Wallet,
  // Communication
  'message-circle': MessageCircle,
  'mail': Mail,
  'bell': Bell,
  'megaphone': Megaphone,
};

function getIconComponent(iconName: string): React.ComponentType<LucideProps> {
  if (!iconName) return LayoutGrid;
  return iconMap[iconName] || LayoutGrid;
}

export default function TopicFilter({
  topics,
  selectedTopics,
  excludedTopics = [],
  isAllMode = true,
  onSelectTopic,
  onToggleColor,
}: TopicFilterProps) {
  // Get unique colors from topics
  const uniqueColors = useMemo(() => {
    const colors = new Set<string>();
    topics.forEach(t => {
      if (t.color) colors.add(t.color);
    });
    return Array.from(colors);
  }, [topics]);

  // "All" is active when in all mode with no exclusions
  const allActive = isAllMode && excludedTopics.length === 0;

  return (
    <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0">
      {/* Color group buttons */}
      {uniqueColors.length > 1 && onToggleColor && (
        <>
          {uniqueColors.map((color) => {
            const topicsWithColor = topics.filter(t => t.color === color);

            // In All mode: check if excluded. In Selection mode: check if selected
            const allColorTopicsActive = isAllMode
              ? topicsWithColor.every(t => !excludedTopics.includes(t.slug))
              : topicsWithColor.every(t => selectedTopics.includes(t.slug));
            const someColorTopicsActive = isAllMode
              ? topicsWithColor.some(t => !excludedTopics.includes(t.slug))
              : topicsWithColor.some(t => selectedTopics.includes(t.slug));
            const allColorTopicsExcluded = isAllMode && topicsWithColor.every(t => excludedTopics.includes(t.slug));

            return (
              <button
                key={color}
                onClick={() => onToggleColor(color)}
                className={`w-7 md:w-8 h-7 md:h-8 rounded-full flex-shrink-0 transition-all ${
                  allColorTopicsExcluded
                    ? 'opacity-30 ring-2 ring-red-500/50'
                    : allColorTopicsActive && !isAllMode
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                    : someColorTopicsActive && !isAllMode
                    ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-gray-900'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: color }}
                title={isAllMode
                  ? `Click to ${allColorTopicsExcluded ? 'show' : 'hide'} ${topicsWithColor.map(t => t.name).join(', ')}`
                  : `Toggle ${topicsWithColor.map(t => t.name).join(', ')}`
                }
              />
            );
          })}
          <div className="w-px h-6 bg-white/20 mx-1" />
        </>
      )}

      {/* All button */}
      <button
        onClick={() => onSelectTopic(null)}
        className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full whitespace-nowrap transition-all text-sm md:text-base ${
          allActive
            ? 'ring-2 ring-white bg-white/20 text-white'
            : isAllMode
            ? 'ring-2 ring-accent/50 bg-accent/10 text-white'
            : 'glass-button text-white/70 hover:text-white'
        }`}
        title={isAllMode ? 'Click to reset (show all)' : 'Click to show all'}
      >
        <LayoutGrid className="w-3.5 md:w-4 h-3.5 md:h-4" />
        <span className="font-medium">All</span>
      </button>

      {/* Topic buttons */}
      {topics.map((topic) => {
        const Icon = getIconComponent(topic.icon || '');
        const isSelected = selectedTopics.includes(topic.slug);
        const isExcluded = excludedTopics.includes(topic.slug);
        const topicColor = topic.color || '#0ea5e9';

        return (
          <button
            key={topic.id}
            onClick={() => onSelectTopic(topic.slug)}
            className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full whitespace-nowrap transition-all glass-button hover:bg-white/10 text-sm md:text-base ${
              isExcluded
                ? 'opacity-40 line-through ring-1 ring-red-500/30'
                : isSelected
                ? 'ring-2 ring-white bg-white/20 text-white'
                : 'text-white/70 hover:text-white'
            }`}
            title={isAllMode
              ? isExcluded ? `Click to show ${topic.name}` : `Click to hide ${topic.name}`
              : isSelected ? `Click to remove ${topic.name}` : `Click to show only ${topic.name}`
            }
          >
            <Icon className="w-3.5 md:w-4 h-3.5 md:h-4" style={{ color: isExcluded ? '#666' : topicColor }} />
            <span className="font-medium">{topic.name}</span>
          </button>
        );
      })}
    </div>
  );
}
