import Link from "next/link";

const STEPS = [
  {
    number: "01",
    title: "Every store owner is vetted personally",
    body: "Before any store joins VYA, we have a direct conversation with the founder. We learn who they are, how they source, and why they do this — because the people behind the pieces matter as much as the pieces themselves.",
  },
  {
    number: "02",
    title: "We review their authentication process",
    body: "We ask every store how they verify authenticity — whether that's in-house inspection, third-party authenticators like Entrupy or CheckCheck, Certificates of Authenticity, or a combination. Stores that can't speak to their process don't make the cut.",
  },
  {
    number: "03",
    title: "We check their track record",
    body: "We look at their history: how long they've been selling, how they handle disputes, and what their customers say. We only partner with sellers who have demonstrated consistency and care.",
  },
  {
    number: "04",
    title: "Ongoing accountability",
    body: "Being on VYA isn't a one-time approval. We stay in touch with every store, monitor feedback, and remove anyone who doesn't uphold our standards — no exceptions.",
  },
];

export default function VerifiedPage() {

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      {/* Hero */}
      <section className="border-b border-[#5D0F17]/10 bg-[#5D0F17] text-[#F7F3EA]">
        <div className="max-w-4xl mx-auto px-6 py-20 sm:py-28">
          <p className="text-xs uppercase tracking-[0.2em] text-[#F7F3EA]/50 mb-4">Our Standard</p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl mb-6 leading-tight">
            Every store on VYA is trusted and verified.
          </h1>
          <p className="text-base sm:text-lg text-[#F7F3EA]/70 max-w-2xl leading-relaxed">
            We don't list stores we haven't spoken to. Every seller on VYA has been personally vetted — their sourcing, their authentication process, and their track record.
          </p>
        </div>
      </section>

      {/* How we vet */}
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
          <h2 className="font-serif text-2xl sm:text-3xl mb-12">How we vet every store</h2>
          <div className="space-y-12">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-8 sm:gap-12">
                <span className="font-serif text-3xl text-[#5D0F17]/20 flex-shrink-0 w-10 leading-none pt-1">
                  {step.number}
                </span>
                <div>
                  <h3 className="font-serif text-xl mb-3">{step.title}</h3>
                  <p className="text-sm text-[#5D0F17]/60 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What this means for you */}
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
          <h2 className="font-serif text-2xl sm:text-3xl mb-8">What this means for you</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <p className="font-serif text-lg mb-2">Shop with confidence</p>
              <p className="text-sm text-[#5D0F17]/60 leading-relaxed">
                Every store on VYA has been screened. You're not rolling the dice on a random seller — you're buying from someone we know and trust.
              </p>
            </div>
            <div>
              <p className="font-serif text-lg mb-2">Transparent policies</p>
              <p className="text-sm text-[#5D0F17]/60 leading-relaxed">
                Each store's authentication approach is listed on their store page, so you can see exactly how your item was verified before it ever reached you.
              </p>
            </div>
            <div>
              <p className="font-serif text-lg mb-2">Real accountability</p>
              <p className="text-sm text-[#5D0F17]/60 leading-relaxed">
                If a store falls short of our standards, they come off the platform. Our reputation depends on theirs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="max-w-4xl mx-auto px-6 py-16 sm:py-24 flex flex-col sm:flex-row gap-4">
          <Link
            href="/stores"
            className="inline-block px-8 py-3 bg-[#5D0F17] text-[#F7F3EA] text-sm uppercase tracking-[0.15em] hover:bg-[#5D0F17]/85 transition text-center"
          >
            Browse All Stores
          </Link>
          <Link
            href="/browse"
            className="inline-block px-8 py-3 border border-[#5D0F17] text-[#5D0F17] text-sm uppercase tracking-[0.15em] hover:bg-[#5D0F17]/5 transition text-center"
          >
            Shop All Products
          </Link>
        </div>
      </section>
    </main>
  );
}
