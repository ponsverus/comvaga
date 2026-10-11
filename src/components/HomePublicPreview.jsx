import { SearchIcon } from './icons';
import { getSupportHref } from '../support';
import HomePublicContent from './HomePublicContent.jsx';

function StaticSearchBox() {
  return (
    <div className="relative">
      <div className="relative flex items-center overflow-hidden rounded-full bg-transparent border border-transparent backdrop-blur-0">
        <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-300" aria-label="Pesquisar">
          <SearchIcon strokeWidth={1.6} className="h-[18px] w-[18px]" />
        </button>
        <input
          type="text"
          value=""
          readOnly
          placeholder="BUSQUE UM PROFISSIONAL OU NEGÓCIO :)"
          className="w-0 bg-transparent pr-4 text-sm text-white uppercase opacity-0 focus:outline-none"
          aria-hidden="true"
          tabIndex="-1"
        />
      </div>
    </div>
  );
}

export default function HomePublicPreview() {
  return (
    <div data-public-home-preview>
      <HomePublicContent
        SearchBoxComponent={StaticSearchBox}
        searchOpen={false}
        setSearchOpen={() => {}}
        searchTerm=""
        setSearchTerm={() => {}}
        resultadosBusca={[]}
        setResultadosBusca={() => {}}
        buscando={false}
        plansSectionRef={null}
        isLogged={false}
        loggedAreaLink="/login"
        loggedAreaLabel="LOGIN"
        supportHref={getSupportHref()}
        handleLogoutClick={() => {}}
      />
    </div>
  );
}
