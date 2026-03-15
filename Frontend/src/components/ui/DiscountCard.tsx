import React from 'react';
import { Bookmark, MapPin, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export interface DiscountCardProps {
  id: string;
  vendorName: string;
  vendorLogo: string;
  vendorBusinessName?: string;
  vendorEmail?: string;
  vendorPhone?: string;
  vendorAddress?: string;
  discountBadge: string;
  title: string;
  description: string;
  expiryDate: string;
  isVerified: boolean;
  isSaved?: boolean;
  distance?: string;
  className?: string;
  claimCount?: number;
  isClaimed?: boolean;
  onClaim?: () => void;
  claiming?: boolean;
  customButton?: React.ReactNode;
}

export function DiscountCard({
  id,
  vendorName,
  vendorLogo,
  vendorBusinessName,
  vendorEmail,
  vendorPhone,
  vendorAddress,
  discountBadge,
  title,
  description,
  expiryDate,
  isVerified,
  isSaved = false,
  distance,
  className,
  claimCount,
  isClaimed = false,
  onClaim,
  claiming = false,
  customButton
}: DiscountCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col overflow-hidden",
      className
    )}>
      {/* Top Banner Area */}
      <div className="relative h-32 bg-slate-50 p-4 flex items-start justify-between">
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-100 overflow-hidden flex items-center justify-center p-1">
            <img src={vendorLogo} alt={vendorName} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
              {vendorName}
              {isVerified && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            </h3>
            {distance && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" /> {distance}
              </p>
            )}
          </div>
        </div>

        <button className={cn(
          "relative z-10 p-2 rounded-full transition-colors",
          isSaved ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-slate-600 hover:bg-white"
        )}>
          <Bookmark className={cn("h-5 w-5", isSaved && "fill-current")} />
        </button>
        {/* Custom button (e.g., remove from saved) */}
        {customButton}
        {/* Background gradient overlay, placed after content for correct stacking */}
        <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-purple-500/5 z-0 pointer-events-none" />
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold w-fit mb-3">
          {discountBadge}
        </div>
        
        <h4 className="font-semibold text-slate-900 text-lg leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
          {title}
        </h4>
        
        <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
          {description}
        </p>

        {(vendorBusinessName || vendorEmail || vendorPhone || vendorAddress) && (
          <div className="text-xs text-slate-500 space-y-1 mb-4">
            {vendorBusinessName && (
              <p>
                <span className="font-semibold text-slate-700">Business:</span> {vendorBusinessName}
              </p>
            )}
            {vendorEmail && (
              <p>
                <span className="font-semibold text-slate-700">Email:</span> {vendorEmail}
              </p>
            )}
            {vendorPhone && (
              <p>
                <span className="font-semibold text-slate-700">Phone:</span> {vendorPhone}
              </p>
            )}
            {vendorAddress && (
              <p className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="font-semibold text-slate-700">Address:</span>
                <span>{vendorAddress}</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vendorAddress)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  View Location
                </a>
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
            <Clock className="h-3.5 w-3.5" />
            Exp: {expiryDate}
          </div>
          
          <div className="flex items-center gap-2">
            {onClaim && (
              <button
                onClick={onClaim}
                disabled={claiming || isClaimed}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isClaimed ? 'Already Claimed' : claiming ? 'Claiming...' : 'Claim Coupon'}
              </button>
            )}
            <Link 
              to={`/discount/${id}`}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              View Details &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
