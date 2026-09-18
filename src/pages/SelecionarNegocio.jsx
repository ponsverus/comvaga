import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfessionalIcon, UserIcon } from '../components/icons';
import { LogOut, Plus } from 'lucide-react';
import { supabase } from '../supabase';
import { isAuthSessionError, refreshCurrentSession, signOutLocalSession } from '../utils/authSession';

function getPublicUrl(bucket, path) {
  if (!bucket || !path) return null;
  try {
    const stripped = path.replace(new RegExp(`^${bucket}/`), '');
    const { data } = supabase.storage.from(bucket).getPublicUrl(stripped);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

function formatBusinessAddress(negocio) {
  const rua = String(negocio?.endereco_rua || '').trim();
  const numero = String(negocio?.endereco_numero || '').trim();
  const bairro = String(negocio?.endereco_bairro || '').trim();
  const cidade = String(negocio?.endereco_cidade || '').trim();
  const estado = String(negocio?.endereco_estado || '').trim().toUpperCase();

  return [
    rua && numero ? `${rua}, ${numero}` : rua,
    bairro,
    estado || (!bairro ? cidade : ''),
  ].filter(Boolean).join(' - ');
}

export default function SelecionarNegocio({ user, onLogout, professionalRole = null }) {
  const navigate = useNavigate();
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!user?.id) {
      setLoading(false);
      return () => { active = false; };
    }

    (async () => {
      try {
        await refreshCurrentSession();
        const { data, error } = await supabase
          .from('negocios')
          .select('id, nome, slug, logo_path, tipo_negocio, endereco_cep, endereco_rua, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_estado')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true });

        if (!active) return;
        if (error) throw error;
        setNegocios(data || []);
        setLoading(false);
      } catch (error) {
        if (!active) return;
        if (isAuthSessionError(error)) {
          await signOutLocalSession();
          navigate('/login', { replace: true });
          return;
        }
        setNegocios([]);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [navigate, user?.id]);

  useEffect(() => {
    if (loading) return;

    if (negocios.length === 1) {
      navigate('/dashboard', { state: { negocioId: negocios[0].id }, replace: true });
      return;
    }

    if (negocios.length === 0) {
      navigate('/conta-profissional', { replace: true });
    }
  }, [loading, negocios, navigate]);

  const handleSelecionar = (negocioId) => {
    navigate('/dashboard', { state: { negocioId }, replace: true });
  };

  if (loading || negocios.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-primary text-xl">CARREGANDO...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <img src="/Comvaga Logo.png" alt="COMVAGA" className="h-14 w-auto object-contain" />
          <button
            type="button"
            onClick={() => onLogout?.()}
            className="inline-flex items-center justify-center gap-2 rounded-button bg-red-600 px-4 py-1.5 text-sm font-normal uppercase transition-colors hover:bg-red-700 sm:py-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-10">
          <h1 className="text-3xl font-normal mb-2 tracking-wide">QUAL NEGÓCIO?</h1>
          <p className="text-gray-500 text-sm font-normal">SELECIONE O NEGÓCIO QUE DESEJA GERENCIAR</p>
          </div>

          <div className="space-y-3 mb-6">
          {negocios.map((neg) => {
            const logoUrl = getPublicUrl('logos', neg.logo_path);
            const endereco = formatBusinessAddress(neg);
            return (
              <button
                key={neg.id}
                type="button"
                onClick={() => handleSelecionar(neg.id)}
                className="w-full flex items-center gap-4 p-4 bg-dark-100 border border-gray-800 hover:border-primary/50 hover:bg-dark-100/80 rounded-custom transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-700 bg-dark-200 shrink-0 flex items-center justify-center">
                  {logoUrl ? (
                    <img src={logoUrl} alt={neg.nome} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-yellow-600 flex items-center justify-center">
                      <ProfessionalIcon className="w-6 h-6 text-black" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-normal text-white group-hover:text-primary transition-colors truncate">{neg.nome}</div>
                  {neg.tipo_negocio && (
                    <div className="text-xs text-gray-500 uppercase mt-0.5">{neg.tipo_negocio}</div>
                  )}
                  {endereco && (
                    <div className="text-xs text-gray-600 uppercase mt-0.5">{endereco}</div>
                  )}
                </div>
                <div className="text-gray-600 group-hover:text-primary transition-colors shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                </div>
              </button>
            );
          })}
          </div>

          <div className="flex items-center gap-3">
          {professionalRole !== 'partner' && (
            <button
              type="button"
              onClick={() => navigate('/criar-negocio')}
              className="flex h-11 flex-1 items-center justify-center rounded-full border border-primary/30 text-[12px] font-normal uppercase leading-none text-primary transition-colors hover:border-primary"
            >
              <span className="inline-flex items-center justify-center gap-2 leading-none">
                <Plus className="w-4 h-4" />
                CRIAR OUTRO
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/conta-profissional')}
            className="flex h-11 flex-1 items-center justify-center rounded-full border border-gray-700 text-[12px] font-normal uppercase leading-none text-gray-300 transition-colors hover:border-primary hover:text-primary"
          >
            <span className="inline-flex items-center justify-center gap-2 leading-none">
              <UserIcon className="w-4 h-4" />
              MINHA CONTA
            </span>
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
