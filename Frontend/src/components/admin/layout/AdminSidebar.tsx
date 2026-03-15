import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Store, 
  CheckSquare, 
  Ticket, 
  BarChart3, 
  Bell, 
  Settings, 
  LogOut,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'Students', path: '/admin/students' },
  { icon: Store, label: 'Vendors', path: '/admin/vendors' },
  { icon: CheckSquare, label: 'Coupon Approvals', path: '/admin/approvals' },
  { icon: Ticket, label: 'All Coupons', path: '/admin/coupons' },
  { icon: BarChart3, label: 'Reports & Analytics', path: '/admin/analytics' },
  { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
  { icon: Settings, label: 'System Settings', path: '/admin/settings' },
];

export function AdminSidebar({ className, onClose }: { className?: string, onClose?: () => void }) {
  const navigate = useNavigate();

  return (
    <aside className={cn("w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-300", className)}>
      {/* Logo Area */}
      <div className="p-6 flex flex-col gap-1 border-b border-slate-800">
        <div className="flex items-center gap-2 text-white">
          <GraduationCap className="h-8 w-8 text-indigo-500" />
          <span className="text-2xl font-bold tracking-tight">STUVERSE</span>
        </div>
        <span className="text-xs text-indigo-400 font-semibold tracking-wide uppercase">
          Admin Control Panel
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            onClick={onClose}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
              isActive 
                ? "bg-indigo-600/10 text-indigo-400" 
                : "hover:bg-slate-800 hover:text-white"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 transition-colors",
              "group-hover:text-indigo-400",
              "text-slate-500"
            )} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors w-full group"
        >
          <LogOut className="h-5 w-5 text-slate-500 group-hover:text-red-400 transition-colors" />
          Logout
        </button>
      </div>
    </aside>
  );
}
