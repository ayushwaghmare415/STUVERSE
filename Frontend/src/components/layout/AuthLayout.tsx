import { ReactNode } from 'react';
import { GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      {/* Left Side - Branding (Hidden on small screens, or stacked) */}
      <div className="md:w-1/2 lg:w-5/12 bg-linear-to-br from-indigo-600 to-blue-500 p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-2 mb-8 md:mb-0">
          <GraduationCap className="h-8 w-8" />
          <span className="text-2xl font-bold tracking-tight">STUVERSE</span>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center mt-8 md:mt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              Welcome to STUVERSE
            </h1>
            <p className="text-indigo-100 text-lg md:text-xl max-w-md">
              Discover exclusive verified student discounts from your favorite local and online vendors.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12 hidden md:block"
          >
            {/* Minimal illustration placeholder */}
            <div className="w-full max-w-sm aspect-video bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 shadow-2xl flex items-center justify-center">
              <div className="flex -space-x-4">
                {[1, 2, 3].map((i) => (
                  <img 
                    key={i}
                    src={`https://picsum.photos/seed/student${i}/100/100`} 
                    alt="Student" 
                    className="w-12 h-12 rounded-full border-2 border-indigo-500 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ))}
                <div className="w-12 h-12 rounded-full border-2 border-indigo-500 bg-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm">
                  +5k
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 text-sm text-indigo-200 mt-8 hidden md:block">
          © 2026 STUVERSE. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-12 relative overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          {children}
        </div>
        <div className="absolute bottom-6 text-center w-full text-sm text-slate-400 md:hidden">
          © 2026 STUVERSE. All rights reserved.
        </div>
      </div>
    </div>
  );
}
