export default function Header() {
    return (
      <header className="sticky top-0 z-50 bg-black">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="text-white font-bold text-xl tracking-wide">
            VIA
          </h1>
  
          <nav className="space-x-8 text-sm tracking-widest text-gray-300">
            <a href="/for-stores" className="hover:text-white">
              For Stores
            </a>
            <a href="/about" className="hover:text-white">
              About
            </a>
            <a href="/join" className="hover:text-white">
              Join
            </a>
          </nav>
        </div>
      </header>
    );
  }
  