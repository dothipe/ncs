import React from "react";
import { HistoryPanel } from "./HistoryPanel";

interface HistoryViewProps {
  history: any[];
  handleRestoreHistoryItem: (id: string) => void;
  handleDeleteHistoryItem: (id: string) => void;
  masterAthletes: any[];
  handleExportBackup: () => void;
  handleImportFullBackup: (file: any) => void;
  userRole: string;
  handleRestoreDeviceBackup: (id: string) => void;
  handleDeleteDeviceBackup: (id: string) => void;
  matchName: string;
  handleSaveCurrentSessionToHistory: () => void;
  startDate: string;
  endDate: string;
  setHistory: (history: any[]) => void;
  activeHistoryId: string | null;
  onlineTournaments?: any[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  handleRestoreHistoryItem,
  handleDeleteHistoryItem,
  masterAthletes,
  handleExportBackup,
  handleImportFullBackup,
  userRole,
  handleRestoreDeviceBackup,
  handleDeleteDeviceBackup,
  matchName,
  handleSaveCurrentSessionToHistory,
  startDate,
  endDate,
  setHistory,
  activeHistoryId,
  onlineTournaments = [],
}) => {
  return (
    <div className="animate-fadeIn" id="history-view-container">
      <HistoryPanel
        history={history}
        onRestoreHistoryItem={handleRestoreHistoryItem}
        onDeleteHistoryItem={handleDeleteHistoryItem}
        currentMasterCount={masterAthletes.length}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportFullBackup}
        userRole={userRole}
        onRestoreDeviceBackup={handleRestoreDeviceBackup}
        onDeleteDeviceBackup={handleDeleteDeviceBackup}
        matchName={matchName}
        onSaveCurrentSessionToHistory={handleSaveCurrentSessionToHistory}
        startDate={startDate}
        endDate={endDate}
        onUpdateHistory={setHistory}
        activeHistoryId={activeHistoryId}
        onlineTournaments={onlineTournaments}
      />
    </div>
  );
};
