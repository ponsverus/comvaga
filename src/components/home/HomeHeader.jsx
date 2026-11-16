import { Link } from 'react-router-dom';

export default function HomeHeader({
  SearchBoxComponent,
  searchOpen,
  setSearchOpen,
  searchTerm,
  setSearchTerm,
  resultadosBusca,
  setResultadosBusca,
  buscando,
}) {
  return (
    <>
      <div className="relative z-50 w-full bg-yellow-400 border-b border-yellow-300/50 overflow-hidden h-10 flex items-center">
        <div className="announcement-bar-wrapper flex">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="announcement-bar-track flex items-center shrink-0 whitespace-nowrap"
              aria-hidden={i === 2}
            >
              {[...Array(14)].map((_, index) => (
                <div key={index} className="flex items-center">
                  <span className="text-black font-normal text-sm uppercase mx-4">TESTE 30 DIAS GRÁTIS</span>
                  <span className="text-black mx-4">●</span>
                  <span className="text-black font-normal text-sm uppercase mx-4">TESTE 30 DIAS GRÁTIS</span>
                  <span className="text-black mx-4">●</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <header className="absolute top-20 left-0 w-full z-40 bg-transparent border-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-center h-16 sm:h-20">
            <Link to="/" className="flex flex-col items-center justify-center gap-1">
              <img
                src="/comvaga-logo.png"
                alt="Comvaga"
                className="h-15 w-auto object-contain sm:h-17"
              />
              <span className="text-2xl sm:text-3xl font-black">COMVAGA</span>
            </Link>
            <div className="absolute right-0 top-[40%] -translate-y-1/2">
              <SearchBoxComponent
                searchOpen={searchOpen}
                setSearchOpen={setSearchOpen}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                resultadosBusca={resultadosBusca}
                setResultadosBusca={setResultadosBusca}
                buscando={buscando}
              />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
