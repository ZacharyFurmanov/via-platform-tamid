export default function CategoriesLoading() {
  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <div className="h-8 w-48 bg-[#5D0F17]/10 rounded animate-pulse mb-2" />
          <div className="h-4 w-80 bg-[#5D0F17]/10 rounded animate-pulse" />
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          {/* Filter bar skeleton */}
          <div className="flex gap-2 mb-8 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-9 w-24 bg-[#5D0F17]/10 rounded-full animate-pulse flex-shrink-0" />
            ))}
          </div>

          {/* Product grid skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className={i % 5 === 0 ? "col-span-2 md:col-span-1" : "col-span-1"}>
                <div className="aspect-[3/4] w-full bg-[#5D0F17]/10 rounded animate-pulse mb-2" />
                <div className="h-3 w-3/4 bg-[#5D0F17]/10 rounded animate-pulse mb-1" />
                <div className="h-3 w-1/2 bg-[#5D0F17]/10 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
