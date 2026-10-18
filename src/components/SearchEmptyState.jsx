export default function SearchEmptyState({ className = '' }) {
  return (
    <div
      role="status"
      aria-label="Nenhum resultado encontrado"
      className={`flex justify-center py-2 text-red-500 ${className}`.trim()}
    >
      <span className="search-empty-face flex w-[26px] flex-col items-center" aria-hidden="true">
        <span className="flex w-[18px] justify-between">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        </span>
        <svg className="mt-[3px] h-3 w-[26px]" viewBox="0 0 26 12" aria-hidden="true">
          <path d="M2 10 Q13 2 24 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}
