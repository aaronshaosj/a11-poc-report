export default function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-4 w-1/3 bg-white/5 rounded" />
      <div className="h-[300px] bg-white/5 rounded-lg" />
      <div className="h-3 w-2/3 bg-white/5 rounded" />
    </div>
  );
}
