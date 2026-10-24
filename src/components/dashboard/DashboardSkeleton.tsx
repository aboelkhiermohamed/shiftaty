import { AppLayout } from "@/components/layout/AppLayout";

export function DashboardSkeleton() {
  return (
    <AppLayout>
      <div className="px-2 pt-6 pb-6 space-y-5 animate-pulse">
        {/* Greeting and Profile Skeleton */}
        <div className="flex items-start justify-between px-2 mt-6 gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-8 bg-slate-200 dark:bg-white/10 rounded-lg w-3/4" />
            <div className="h-4 bg-slate-200 dark:bg-white/5 rounded-lg w-1/2" />
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex-shrink-0" />
        </div>

        {/* Month Selector Skeleton */}
        <div className="flex items-center justify-between px-2 mt-6 h-12">
          <div className="h-10 bg-slate-100 dark:bg-[#1C1C1E]/80 rounded-2xl w-40 border border-slate-200 dark:border-white/5" />
          <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-lg w-16" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="px-2 grid grid-cols-2 gap-3">
          {/* Featured Stat Card Skeleton */}
          <div className="col-span-2 h-[140px] bg-slate-200 dark:bg-white/10 rounded-[24px]" />
          
          {/* Two Stat Cards Skeletons side-by-side */}
          <div className="col-span-1 h-[94px] bg-slate-200 dark:bg-white/10 rounded-2xl" />
          <div className="col-span-1 h-[94px] bg-slate-200 dark:bg-white/10 rounded-2xl" />
        </div>

        {/* Income Breakdown Skeleton */}
        <div className="px-2 mt-6">
          <div className="h-48 bg-slate-200 dark:bg-white/10 rounded-2xl w-full" />
        </div>

        {/* Recent Shifts Skeleton */}
        <div className="px-2 mt-6 space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-white/5 rounded-lg w-24 mb-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-white/10 rounded-2xl w-full" />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
