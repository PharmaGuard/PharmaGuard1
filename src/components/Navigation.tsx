import { Shield, Users, ChevronRight } from 'lucide-react';
import type { EncounterTab } from '../types';

interface NavigationProps {
  encounterView?: EncounterTab;
  patientName?: string;
  onTabChange?: (tab: EncounterTab) => void;
  onBackToList?: () => void;
  alertCounts?: { red: number; amber: number; green: number };
  isEncounterView: boolean;
  isDischargedEncounter?: boolean;
}

const TABS: { id: EncounterTab; label: string; dischargedOnly?: boolean }[] = [
  { id: 'medications', label: 'Medications' },
  { id: 'alerts', label: 'Risk Alerts' },
  { id: 'review', label: 'Review' },
  { id: 'discharge', label: 'Discharge' },
  { id: 'followup', label: 'Follow-up', dischargedOnly: true },
  { id: 'audit', label: 'Audit Trail' },
];

export default function Navigation({
  encounterView,
  patientName,
  onTabChange,
  onBackToList,
  alertCounts,
  isEncounterView,
  isDischargedEncounter = false,
}: NavigationProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 h-14">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Shield className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-slate-900 text-base tracking-tight">PharmaGuard</span>
            <span className="hidden sm:inline text-xs text-slate-400 font-medium ml-1">Elderly Med Safety</span>
          </div>

          {isEncounterView && patientName && (
            <>
              <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <button
                onClick={onBackToList}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Patients</span>
              </button>
              <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-slate-800 truncate max-w-[120px] sm:max-w-xs">
                {patientName}
              </span>
            </>
          )}

          {isEncounterView && (
            <nav className="flex items-center gap-0.5 ml-auto overflow-x-auto">
              {TABS.filter(tab => !tab.dischargedOnly || isDischargedEncounter).map(tab => {
                const isActive = encounterView === tab.id;
                const count = tab.id === 'alerts' && alertCounts
                  ? alertCounts.red + alertCounts.amber
                  : 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange?.(tab.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                    {count > 0 && tab.id === 'alerts' && (
                      <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-xs font-bold">
                        {count > 9 ? '9+' : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {!isEncounterView && (
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
              <span className="hidden sm:inline">General Medicine Ward — Pilot</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
