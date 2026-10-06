import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applyNotFoundSeo } from '../utils/notFoundSeo.js';

export default function NotFound() {
  useEffect(() => applyNotFoundSeo(), []);
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="text-6xl font-normal leading-none text-red-500 mb-6">:(</div>

        <h1 className="text-5xl font-normal uppercase mb-3">Erro 404</h1>
        <p className="text-xl text-gray-300 font-normal uppercase mb-4">Página perdida</p>
        <p className="text-gray-400 mb-8">
          O link acessado é inexistente ou foi removido.
        </p>

        <Link
          to="/"
          className="inline-flex w-full items-center justify-center rounded-button bg-gradient-to-r from-primary to-yellow-600 py-3 text-sm font-normal uppercase text-black transition-all hover:shadow-lg hover:shadow-primary/20"
        >
          Voltar para home
        </Link>
      </div>
    </div>
  );
}
