import React from 'react';
import { Files, Search, Puzzle, Settings } from 'lucide-react';
import { ViewMode, Language } from '../../types';
import { t } from '../../utils/i18n';

interface ActivityBarProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenSettings: () => void;
  language: Language;
}

const ActivityBar: React.FC<ActivityBarProps> = ({ activeView, onViewChange, onOpenSettings, language }) => {
  
  const topItems = [
    { id: 'prompts', icon: Files, label: t('activity.prompts', language) }, 
    { id: 'search', icon: Search, label: t('activity.search', language) },
    { id: 'extensions', icon: Puzzle, label: t('activity.extensions', language) },
  ];

  return (
    <div className="w-14 min-w-[56px] h-full bg-[var(--bg-panel)] flex flex-col justify-between items-center py-4 select-none rounded-2xl border border-[var(--border-color)]">
      <div className="flex flex-col w-full items-center gap-3">
        {topItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onViewChange(isActive ? 'none' : item.id as ViewMode)}
              title={item.label}
              className={`
                w-10 h-10 flex justify-center items-center cursor-pointer rounded-xl transition-all duration-200
                ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-[var(--text-secondary)] hover:bg-[var(--item-hover)] hover:text-[var(--text-primary)]'}
              `}
            >
              <item.icon size={20} strokeWidth={isActive ? 2 : 1.5} />
            </div>
          );
        })}
      </div>

      <div className="flex flex-col w-full items-center">
         <div
              onClick={onOpenSettings}
              title={t('activity.settings', language)}
              className={`
                w-10 h-10 flex justify-center items-center cursor-pointer rounded-xl transition-all duration-200
                text-[var(--text-secondary)] hover:bg-[var(--item-hover)] hover:text-[var(--text-primary)]
              `}
            >
              <Settings size={20} strokeWidth={1.5} />
            </div>
      </div>
    </div>
  );
};

export default ActivityBar;