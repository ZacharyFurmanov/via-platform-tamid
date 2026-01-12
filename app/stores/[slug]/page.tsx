type Store = {
  name: string;
  location: string;
  description: string;
  externalUrl: string;
  products: {
    id: number;
    name: string;
    price: string;
  }[];
};

export default function StorePage({
  params,
}: {
  params: { slug: string };
}) {
  // later this will come from a database using `params.slug`
  const store: Store = {
    name: "No Standing NYC",
    location: "New York, NY",
    description:
      "A curated selection of designer vintage and archival pieces.",
    externalUrl: "https://example.com",
    products: [
      { id: 1, name: "Vintage Prada Jacket", price: "$420" },
      { id: 2, name: "Gucci Loafers", price: "$380" },
      { id: 3, name: "Silk Slip Dress", price: "$190" },
    ],
  };

  return (
    <div className="py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{store.name}</h1>
        <p className="text-gray-400">{store.location}</p>
      </div>

      {/* Description */}
      <p className="text-gray-300 mb-8 max-w-2xl">
        {store.description}
      </p>

      {/* Products */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {store.products.map((product) => (
          <div
            key={product.id}
            className="border border-gray-800 rounded-lg p-4"
          >
            <h3 className="font-medium mb-1">{product.name}</h3>
            <p className="text-gray-400">{product.price}</p>
          </div>
        ))}
      </div>

      {/* External link (temporary) */}
      <a
        href={store.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-md bg-white px-6 py-3 text-black font-medium hover:bg-gray-200 transition"
      >
        Shop on store site
      </a>
    </div>
  );
}
