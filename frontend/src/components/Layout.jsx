import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col h-screen overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
