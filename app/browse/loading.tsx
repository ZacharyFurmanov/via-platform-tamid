export default function BrowseLoading() {
  return (
    <div className="bg-[#FFFDF8] min-h-screen">
      {/* Filter bar skeleton */}
      <div className="border-b border-[#5D0F17]/10 py-4 px-6">
        <div className="max-w-7xl mx-auto flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-20 bg-[#5D0F17]/10 rounded-full animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Product grid skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] bg-[#5D0F17]/10 mb-2" />
              <div className="h-3 bg-[#5D0F17]/10 rounded w-3/4 mb-1.5" />
              <div className="h-3 bg-[#5D0F17]/10 rounded w-1/2 mb-1.5" />
              <div className="h-3 bg-[#5D0F17]/10 rounded w-1/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
