import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, Bookmark, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Home', path: '/' },
  { icon: Search, label: 'Browse', path: '/browse' },
  { icon: Bookmark, label: 'Saved', path: '/saved' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export function BottomNav({ className }: { className?: string }) {
  return (
    <nav className={cn("fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-40", className)}>
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 text-xs font-medium transition-colors",
              isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <item.icon className={cn("h-5 w-5", "transition-transform duration-200")} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
