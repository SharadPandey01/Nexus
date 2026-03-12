import { useState } from 'react';
import CommandBar from './CommandBar';
import Sidebar from './SideBar';

const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen bg-black bg-light-streaks text-text-primary overflow-hidden font-sans">
            {/* Fixed Sidebar */}
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out">
                {/* Fixed Top Command Bar */}
                <CommandBar />

                {/* Scrollable Page Content */}
                <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
