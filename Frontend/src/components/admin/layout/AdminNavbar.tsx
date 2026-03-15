import { Bell, Search, Menu, X, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function AdminNavbar({ onMenuClick, isMobileMenuOpen, className }: { onMenuClick: () => void, isMobileMenuOpen: boolean, className?: string }) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <header className={cn("h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30", className)}>
      {/* Mobile Menu Button */}
      <button 
        onClick={onMenuClick}
        className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl hidden md:flex items-center relative">
        <Search className="h-5 w-5 text-slate-400 absolute left-3" />
        <input 
          type="text" 
          placeholder="Global search (students, vendors, coupons)..." 
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Admin Badge (Mobile) */}
        <div className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
          <ShieldAlert className="h-3.5 w-3.5" />
          Admin
        </div>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors relative"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>
          </button>

          {/* Notification Dropdown */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">System Alerts</h3>
                <button className="text-xs text-indigo-600 font-medium hover:text-indigo-700">Mark all read</button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex gap-3 transition-colors bg-orange-50/50">
                  <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-900 font-medium">New Vendor Registration</p>
                    <p className="text-xs text-slate-500 mt-0.5">"Nike Store" is pending approval.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Just now</p>
                  </div>
                </div>
                <div className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex gap-3 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-900 font-medium">Coupon Submitted</p>
                    <p className="text-xs text-slate-500 mt-0.5">A vendor submitted a new coupon.</p>
                    <p className="text-[10px] text-slate-400 mt-1">10 mins ago</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <button className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
          <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white border border-slate-100">
            A
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-semibold text-slate-900 leading-none">Super Admin</span>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5">System Owner</span>
          </div>
        </button>
      </div>
    </header>
  );
}
