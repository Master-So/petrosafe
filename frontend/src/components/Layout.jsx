import React, { useState } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div className={`flex-1 flex flex-col h-screen overflow-y-auto transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
        {children}
      </div>
    </div>
  );
}
