import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Bookmark, 
  Ticket, 
  Bell, 
  User, 
  LogOut,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Search, label: 'Browse Discounts', path: '/browse' },
  { icon: Bookmark, label: 'Saved Offers', path: '/saved' },
  { icon: Ticket, label: 'My Redemptions', path: '/redemptions' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export function Sidebar({ className }: { className?: string }) {
  const navigate = useNavigate();

  return (
    <aside className={cn("w-64 bg-white border-r border-slate-200 flex flex-col h-full", className)}>
      {/* Logo Area */}
      <div className="p-6 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-indigo-600">
          <GraduationCap className="h-8 w-8" />
          <span className="text-2xl font-bold tracking-tight">STUVERSE</span>
        </div>
        <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">
          Student Discount Universe
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
              isActive 
                ? "bg-indigo-50 text-indigo-700" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 transition-colors",
              "group-hover:text-indigo-600",
              "text-slate-400"
            )} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-100">
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full group"
        >
          <LogOut className="h-5 w-5 text-slate-400 group-hover:text-red-500 transition-colors" />
          Logout
        </button>
      </div>
    </aside>
  );
}
