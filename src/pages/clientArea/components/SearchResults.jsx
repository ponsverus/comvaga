import { Link } from 'react-router-dom';
import { ProfessionalIcon } from '../../../components/icons';
import SearchEmptyState from '../../../components/SearchEmptyState';

function SearchResult({ row, onSelect }) {
  const tipo = String(row?.tipo || '').toLowerCase();
  const isNegocio = tipo === 'negocio';
  const subtitle = String(row?.subtitulo || '').trim();

  if (!isNegocio) {
    return (
      <Link
        key={`${row?.tipo || 'item'}-${row?.id || row?.slug}`}
        to={`/v/${row?.slug}`}
        onClick={onSelect}
        className="block border-b border-white/5 px-5 py-4 text-left transition-colors hover:bg-dark-200/90 last:border-b-0"
      >
        <div className="font-normal text-white uppercase">{row?.nome || '\u2014'}</div>
        {subtitle && (
          <div className="mt-1 text-sm text-gray-400">{subtitle}</div>
        )}
      </Link>
    );
  }

  return (
    <Link
      key={`${row?.tipo || 'item'}-${row?.id || row?.slug}`}
      to={`/v/${row?.slug}`}
      onClick={onSelect}
      className="block border-b border-white/5 px-4 py-4 text-left transition-colors hover:bg-dark-200/90 last:border-b-0"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-800 bg-dark-200">
          <ProfessionalIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-normal uppercase text-white">{row?.nome || '\u2014'}</div>
          {subtitle && (
            <div className="mt-1 truncate text-xs uppercase text-gray-500">{subtitle}</div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function SearchResults({
  mobile = false,
  searchTerm,
  searching,
  searchError,
  searchRows,
  onSelectResult,
}) {
  const hasQuery = String(searchTerm || '').trim().length >= 3;
  if (!hasQuery) return null;
  if (!searching && searchError) return null;

  if (!searching && !searchError && searchRows.length === 0) {
    const emptyStateClass = mobile
      ? 'mt-3'
      : 'absolute right-0 top-full z-50 mt-3 w-[min(24rem,calc(100vw-2rem))]';
    return <SearchEmptyState className={emptyStateClass} />;
  }

  const wrapClass = mobile
    ? 'mt-3 overflow-hidden rounded-[3px] border border-white/10 bg-dark-100/95 shadow-2xl backdrop-blur-xl'
    : 'absolute right-0 top-full z-50 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[3px] border border-white/10 bg-dark-100/95 shadow-2xl backdrop-blur-xl';

  return (
    <div className={wrapClass}>
      {searching && (
        <div className="px-4 py-4 text-sm text-gray-400">
          BUSCANDO...
        </div>
      )}
      {!searching && !searchError && searchRows.length > 0 && (
        <div>
          {searchRows.map((row) => (
            <SearchResult key={`${row?.tipo || 'item'}-${row?.id || row?.slug}`} row={row} onSelect={onSelectResult} />
          ))}
        </div>
      )}
    </div>
  );
}
