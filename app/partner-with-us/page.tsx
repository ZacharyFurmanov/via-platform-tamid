export default function PartnerWithUsPage() {
    return (
      <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-24 flex justify-center">
        <div className="w-full max-w-xl">
          
          <h1 className="text-4xl font-semibold mb-6 text-center">
            Partner with VIA
          </h1>
  
          <p className="text-gray-400 text-center mb-12">
            Tell us a bit about your store and we’ll be in touch.
          </p>
  
          <form className="space-y-6">
            <input
              type="text"
              placeholder="Store name"
              className="w-full bg-black border border-gray-700 px-4 py-3 rounded-md focus:border-white"
            />
  
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-black border border-gray-700 px-4 py-3 rounded-md focus:border-white"
            />
  
            <input
              type="url"
              placeholder="Website or Instagram"
              className="w-full bg-black border border-gray-700 px-4 py-3 rounded-md focus:border-white"
            />
  
            <textarea
              placeholder="Tell us about your store"
              rows={4}
              className="w-full bg-black border border-gray-700 px-4 py-3 rounded-md focus:border-white"
            />
  
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
  