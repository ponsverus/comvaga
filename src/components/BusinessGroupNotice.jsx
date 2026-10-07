import { RefreshCw } from 'lucide-react';

export default function BusinessGroupNotice({ status, onRetry }) {
  const loading = status === 'loading';
  return (
    <div className="py-8 text-center" role={loading ? 'status' : 'alert'}>
      <p className="text-sm text-gray-400">
        {loading ? 'Carregando informa\u00e7\u00f5es...' : 'N\u00e3o foi poss\u00edvel carregar estas informa\u00e7\u00f5es.'}
      </p>
      {!loading && (
        <button type="button" onClick={onRetry}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-button border border-primary/50 bg-primary/20 px-5 py-3 text-sm uppercase text-primary hover:bg-primary/30">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
