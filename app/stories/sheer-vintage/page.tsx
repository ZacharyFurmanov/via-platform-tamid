import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Sheer Vintage — The Story Behind the Selection | VYA",
  description:
    "Based in Canada, Sheer Vintage is a curated destination for archival designer vintage, with a focus on bridal, runway, and statement eveningwear.",
};

export default function SheerVintageStory() {
  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      {/* Back nav */}
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-4">
        <Link
          href="/stories"
          className="inline-block text-xs tracking-[0.25em] uppercase text-[#5D0F17]/50 hover:text-[#5D0F17] transition"
        >
          &larr; All Stories
        </Link>
      </div>

      {/* Hero image */}
      <div className="max-w-4xl mx-auto px-6 mb-12">
        <div className="aspect-[3/4] sm:aspect-[16/9] relative overflow-hidden rounded-sm">
          <Image
            src="/stores/sheer-vintage-story.jpg"
            alt="Sheer Vintage"
            fill
            priority
            className="object-cover"
          />
        </div>
      </div>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-6 pb-24">
        <p className="text-xs uppercase tracking-[0.25em] text-[#5D0F17]/50 mb-4">
          The Story Behind the Selection
        </p>

        <h1 className="text-3xl sm:text-5xl font-serif mb-10 leading-tight">
          Sheer Vintage
        </h1>

        <div className="prose prose-lg max-w-none text-[#5D0F17]/70 leading-relaxed space-y-6">
          <p>
            Based in Canada, Sheer Vintage is a curated destination for archival designer vintage,
            with a focus on bridal, runway, and statement eveningwear.
          </p>

          <p>
            Sheer Vintage was created with the desire to bring incredible designer pieces to
            Canadians and worldwide. These pieces focus on iconic designers and incredible materials
            that you can only find vintage.
          </p>

          <p className="font-serif text-[#5D0F17] text-xl">
            The yellow rose logo honours both of my grandmothers and the idea of cherished things
            being passed down. Sheer is built on that same feeling: a celebration of memory and
            style that endures.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-12 pt-8 border-t border-[#5D0F17]/10">
          <Link
            href="/stores/sheer-vintage"
            className="inline-block bg-[#5D0F17] text-[#F7F3EA] px-8 py-4 text-sm uppercase tracking-wide hover:bg-[#5D0F17]/85 transition"
          >
            Shop Sheer Vintage
          </Link>
        </div>
      </article>
    </main>
  );
}
