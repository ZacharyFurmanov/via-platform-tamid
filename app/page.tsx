"use client";

export default function PartnerWithUsPage() {
  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-24 flex justify-center">
      <div className="w-full max-w-xl">

        <h1 className="text-4xl font-semibold mb-6 text-center">
          Partner with VIA
        </h1>

        <p className="text-gray-400 text-center mb-12">
          Tell us about your store and we’ll be in touch shortly.
        </p>

        <form
          action="https://formspree.io/f/mpqqzgeb"
          method="POST"
          className="space-y-6"
        >
          <input
            type="text"
            name="store_name"
            placeholder="Store name"
            required
            className="w-full bg-black border border-gray-700 px-4 py-3 rounded-md focus:border-white focus:outline-none"
          />

          <input
            type="email"
            name="email"
            placeholder="Contact email"
            required
            className="w-full bg-black border border-gray-700 px-4 py-3 rounded-md focus:border-white focus:outline-none"
          />

          <input
            type="url"
            name="website"
            placeholder="Website or Instagram"
            className="w-full bg-black border border-gray-700 px-4 py-3 rounded-md focus:border-white focus:outline-none"
          />

          <textarea
            name="about"
            rows={4}
            placeholder="Tell us about your store"
            className="w-full bg-black border border-gray-700 px-4 py-3 rounded-md focus:border-white focus:outline-none"
          />

          {/* Metadata */}
          <input type="hidden" name="source" value="Partner with VIA page" />

          <button
            type="submit"
            className="w-full bg-white text-black py-3 rounded-md font-medium hover:bg-gray-200 transition"
          >
            Submit
          </button>
        </form>

      </div>
    </main>
  );
}
