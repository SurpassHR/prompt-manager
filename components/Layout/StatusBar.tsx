import React from 'react';
import { Radio } from 'lucide-react';
import { Language } from '../../types';
import { t } from '../../utils/i18n';

interface StatusBarProps {
  language: Language;
}

const StatusBar: React.FC<StatusBarProps> = ({ language }) => {
  return (
    <div className="h-8 w-full bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center justify-between px-4 text-[11px] select-none rounded-xl shadow-sm">
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 hover:text-[var(--text-primary)] cursor-default transition-colors">
                <Radio size={12} className="text-emerald-500" />
                <span>{t('status.ready', language)}</span>
            </div>
        </div>

        <div className="flex items-center space-x-4">
             {/* Future functional modules can be added here */}
        </div>
    </div>
  );
};

export default StatusBar;