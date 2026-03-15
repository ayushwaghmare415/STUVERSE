import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { VendorSidebar } from './VendorSidebar';
import { VendorNavbar } from './VendorNavbar';
import { cn } from '@/lib/utils';
import { getSocket, disconnectSocket } from '@/lib/socket';
import toast from 'react-hot-toast';

export function VendorLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // establish single socket connection for all vendor pages
  useEffect(() => {
    const socket = getSocket();

    socket.on('adminBroadcast', (data) => {
      toast(data.message || 'System notification', {
        icon: '🔔'
      });
    });

    // cleanup on unmount (when leaving vendor section)
    return () => {
      socket.off('adminBroadcast');
      disconnectSocket();
    };
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <VendorSidebar className="hidden md:flex" />

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out md:hidden",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <VendorSidebar onClose={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <VendorNavbar 
          onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          isMobileMenuOpen={isMobileMenuOpen}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
