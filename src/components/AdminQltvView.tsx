import React from "react";
import { MemberManagementPanel } from "./MemberManagementPanel";

interface AdminQltvViewProps {
  currentUser: any;
  language: string;
}

export const AdminQltvView: React.FC<AdminQltvViewProps> = ({
  currentUser,
  language,
}) => {
  return (
    <div className="animate-fadeIn" id="admin-qltv-view-container">
      <MemberManagementPanel
        currentUser={currentUser}
        language={language}
      />
    </div>
  );
};
