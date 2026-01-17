type Product = {
  name: string;
  price: string;
  category: string;
  storeName: string;
};

export default function ProductCard({
  name,
  price,
  category,
  storeName,
}: Product) {
  return (
    <div className="group cursor-pointer text-black">
      {/* Image placeholder */}
      <div className="aspect-[3/4] bg-neutral-200 mb-4 border border-black" />

      <p className="text-xs text-black/60 mb-1">{storeName}</p>
      <h3 className="font-serif text-lg text-black">{name}</h3>
      <p className="text-sm text-black/70">{category}</p>
      <p className="text-sm mt-1 text-black">{price}</p>
    </div>
  );
}
