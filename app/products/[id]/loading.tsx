export default function ProductLoading() {
  return (
    <main className="bg-white min-h-screen animate-pulse">
      {/* Back nav skeleton */}
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <div className="h-4 w-24 bg-neutral-200 rounded" />
      </div>

      {/* Product layout skeleton */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          {/* Image skeleton */}
          <div className="aspect-[3/4] bg-neutral-100 rounded" />

          {/* Details skeleton */}
          <div className="flex flex-col justify-center py-4 md:py-8">
            <div className="h-3 w-28 bg-neutral-200 rounded mb-4" />
            <div className="h-8 w-3/4 bg-neutral-200 rounded mb-2" />
            <div className="h-8 w-1/2 bg-neutral-200 rounded mb-4" />
            <div className="h-4 w-20 bg-neutral-200 rounded mb-2" />
            <div className="h-7 w-16 bg-neutral-200 rounded mb-8" />
            <div className="space-y-2 mb-8">
              <div className="h-3 w-full bg-neutral-100 rounded" />
              <div className="h-3 w-full bg-neutral-100 rounded" />
              <div className="h-3 w-2/3 bg-neutral-100 rounded" />
            </div>
            <div className="h-14 w-full bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    </main>
  );
}
