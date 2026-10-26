import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import MainContent from "./MainContent";

const Dashboard = () => {
  const [activeComponent, setActiveComponent] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="h-screen flex-shrink-0">
        <Sidebar
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          setActiveComponent={setActiveComponent}
        />
      </div>

      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        <Navbar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
        <main className="flex-1 overflow-y-auto bg-gray-100  custom-scrollbar">
          <MainContent activeComponent={activeComponent} />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
