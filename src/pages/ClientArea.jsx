import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { SearchIcon, TimePastIcon, UserIcon } from '../components/icons';
import AppFooter from '../components/AppFooter';
import { useFeedback } from '../feedback/useFeedback';
import { getPublicUrl } from '../utils/storage';
import { getRequestErrorKey } from '../utils/requestError';
import {
  fetchClientePerfil,
  fetchCurrentClienteId,
} from './clientArea/api/clientAreaApi';
import Heart from './clientArea/components/Heart';
import BookingsSection from './clientArea/components/BookingsSection';
import FavoritesSection from './clientArea/components/FavoritesSection';
import SearchResults from './clientArea/components/SearchResults';
import { useClientAccount } from './clientArea/useClientAccount';
import { useClientActivity } from './clientArea/useClientActivity';
import { useClientSearch } from './clientArea/useClientSearch';
import {
  PAGE_SIZE,
  maskedPrivateValue,
} from './clientArea/utils';

export default function ClientArea({ user, onLogout, userType = 'client' }) {
  const navigate = useNavigate();
  const feedback = useFeedback();

  const uiAlert = useCallback((key, variant = 'info', params = {}) => {
    if (feedback?.showMessage) return feedback.showMessage(key, { variant, ...params });
    return Promise.resolve();
  }, [feedback]);

  const uiConfirm = async (key, variant = 'warning') => {
    return !!(await feedback.confirm(key, { variant }));
  };

  const [activeTab,       setActiveTab]       = useState('agendamentos');
  const [loading,         setLoading]         = useState(true);
  const {
    searchOpen,
    searchTerm,
    searchRows,
    searching,
    searchError,
    desktopSearchRef,
    desktopSearchInputRef,
    clearSearch,
    handleSearchChange,
    toggleDesktopSearch,
  } = useClientSearch(feedback);

  const {
    avatarPath,
    uploadingAvatar,
    fileInputRef,
    nomePerfil,
    setNomePerfil,
    savingPerfil,
    novoEmail,
    setNovoEmail,
    telefoneCliente,
    setTelefoneCliente,
    novaSenha,
    setNovaSenha,
    confirmarSenha,
    setConfirmarSenha,
    savingDados,
    deletingAccount,
    emailVisivel,
    isDadosEditing,
    dadosFieldChanged,
    dadosInputStateClass,
    startDadosEditing,
    saveDadosField,
    openFilePicker,
    onPickAvatar,
    salvarNome,
    salvarEmail,
    salvarTelefone,
    salvarSenha,
    handleExcluirContaCliente,
    applyProfile,
  } = useClientAccount({ user, onLogout, navigate, uiAlert, uiConfirm });

  const [clienteId, setClienteId] = useState(null);
  const {
    agendamentos,
    favoritos,
    agendamentosHasMore,
    favoritosHasMore,
    agendamentosLoadingMore,
    favoritosLoadingMore,
    removingFavoritoId,
    avaliacoesPorAgendamento,
    depoimentoLoading,
    depoimentoAlvo,
    depoimentoNota,
    setDepoimentoNota,
    depoimentoTexto,
    setDepoimentoTexto,
    agendamentosPorStatus,
    fetchAgendamentos,
    fetchFavoritos,
    applyInitialRows,
    clearActivity,
    subscribeRealtime,
    cancelarAgendamento,
    marcarNovamente,
    abrirDepoimento,
    enviarDepoimentoAgendamento,
    removerFavorito,
    carregarMaisAgendamentos,
    carregarMaisFavoritos,
  } = useClientActivity({ clienteId, uiAlert, uiConfirm, feedback, navigate });

  const fetchClienteId = useCallback(async () => {
    return fetchCurrentClienteId();
  }, []);

  const loadPerfil = useCallback(async () => {
    return fetchClientePerfil(user.id);
  }, [user.id]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [perfil, currentClienteId] = await Promise.all([
        loadPerfil(),
        fetchClienteId(),
      ]);
      setClienteId(currentClienteId);
      const [agendamentosRows, favoritosRows] = await Promise.all([
        fetchAgendamentos({ clienteId: currentClienteId, limit: PAGE_SIZE + 1 }),
        fetchFavoritos({ clienteId: currentClienteId, limit: PAGE_SIZE + 1 }),
      ]);
      applyProfile(perfil);
      await applyInitialRows(agendamentosRows, favoritosRows);
    } catch (error) {
      const requestKey = getRequestErrorKey(error);
      if (requestKey === 'alerts.request_timeout') {
        uiAlert(requestKey, 'warning');
      } else if (requestKey === 'alerts.rate_limit_exceeded') {
        uiAlert(requestKey, 'warning');
      } else {
        console.error('Client area load error:', error);
        uiAlert('clientArea.load_data_error', 'warning');
      }
      clearActivity();
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadPerfil, fetchClienteId, fetchAgendamentos, fetchFavoritos, applyProfile, applyInitialRows, clearActivity, uiAlert]);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id, loadData]);

  useEffect(() => subscribeRealtime(), [subscribeRealtime]);

  const dataEditButtonClass = 'shrink-0 rounded-full bg-primary px-3 py-1 text-[12px] font-normal uppercase text-black transition-colors hover:bg-primary/90 disabled:opacity-50';
  const dataSaveButtonClass = 'shrink-0 rounded-full border border-primary/30 px-3 py-1 text-[12px] font-normal uppercase text-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40';
  const dataInputClass = 'w-full bg-transparent px-0 py-2 text-[14px] text-white placeholder-gray-600 outline-none focus:text-white';
  const dataPillInputClass = 'w-full rounded-full border border-gray-800 bg-transparent px-4 py-2 text-center text-[14px] text-white placeholder-gray-600 outline-none focus:border-primary/50 focus:text-white';

  const renderDadosAction = (field, saveFn, saving) => (
    isDadosEditing(field) ? (
      <button
        type="button"
        disabled={saving || !dadosFieldChanged(field)}
        onClick={() => saveDadosField(field, saveFn)}
        className={dataSaveButtonClass}
      >
        {saving ? 'SALVANDO' : 'SALVAR'}
      </button>
    ) : (
      <button
        type="button"
        disabled={saving}
        onClick={() => startDadosEditing(field)}
        className={dataEditButtonClass}
      >
        EDITAR
      </button>
    )
  );
  const avatarUrl      = getPublicUrl('avatars', avatarPath);
  const nomeCabecalho  = String(nomePerfil || user?.user_metadata?.nome || '—').trim();
  const avatarFallback = nomeCabecalho?.[0]?.toUpperCase() || '?';
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-primary text-2xl animate-pulse">CARREGANDO...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-dark-100 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link to="/" className="flex items-center gap-3">
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-gray-800 bg-dark-200 flex items-center justify-center">
                {avatarUrl
                  ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  : <span className="text-white font-normal">{avatarFallback}</span>
                }
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl font-normal">MINHA ÁREA</h1>
                <p className="text-xs text-blue-400 -mt-1">CLIENTE</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <div ref={desktopSearchRef} className="relative hidden md:block">
                <div
                  className={[
                    'relative flex h-11 items-center overflow-hidden rounded-full transition-all duration-300 ease-out',
                    searchOpen
                      ? 'w-72 border border-white/10 bg-black/40 backdrop-blur-md lg:w-96'
                      : 'w-11 border border-transparent bg-transparent',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={toggleDesktopSearch}
                    className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-300 transition-colors hover:text-primary"
                    aria-label="Pesquisar negócio ou profissional"
                  >
                    <SearchIcon strokeWidth={1.6} className="h-[18px] w-[18px]" />
                  </button>
                  <input
                    ref={desktopSearchInputRef}
                    type="search"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="PESQUISAR NEGÓCIO OU PROFISSIONAL"
                    className={[
                      'min-w-0 flex-1 bg-transparent pr-4 text-sm uppercase text-white placeholder:text-gray-500 focus:outline-none transition-opacity duration-200',
                      searchOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
                    ].join(' ')}
                    tabIndex={searchOpen ? 0 : -1}
                  />
                  {searching && searchOpen && String(searchTerm || '').trim().length >= 3 && (
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 rounded-full border border-primary border-t-transparent animate-spin" />
                    </div>
                  )}
                </div>
                {searchOpen && (
                  <SearchResults
                    searchTerm={searchTerm}
                    searching={searching}
                    searchError={searchError}
                    searchRows={searchRows}
                    onSelectResult={clearSearch}
                  />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
              <button onClick={openFilePicker} disabled={uploadingAvatar} className="h-9 px-5 bg-dark-200 border border-gray-800 hover:border-primary/50 rounded-button text-sm transition-all uppercase focus:outline-none">
                {uploadingAvatar ? 'ENVIANDO...' : 'FOTO'}
              </button>
              <button onClick={() => onLogout?.()} className="h-9 flex items-center gap-2 px-5 bg-red-600 hover:bg-red-700 text-white rounded-button text-sm transition-all uppercase focus:outline-none">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">SAIR</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 md:hidden">
          <div className="mx-auto max-w-md">
            <div className="relative flex h-11 items-center overflow-hidden rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-300">
                <SearchIcon strokeWidth={1.6} className="h-[18px] w-[18px]" />
              </div>
              <input
                type="search"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="PESQUISAR NEGÓCIO OU PROFISSIONAL"
                className="min-w-0 flex-1 bg-transparent pr-4 text-sm uppercase text-white placeholder:text-gray-500 focus:outline-none"
              />
              {searching && String(searchTerm || '').trim().length >= 3 && (
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 rounded-full border border-primary border-t-transparent animate-spin" />
                </div>
              )}
            </div>
            <SearchResults
              mobile
              searchTerm={searchTerm}
              searching={searching}
              searchError={searchError}
              searchRows={searchRows}
              onSelectResult={clearSearch}
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl sm:text-4xl font-normal mb-2">Olá {nomeCabecalho} :)</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 items-start">
          <button onClick={() => setActiveTab('agendamentos')} className="bg-dark-100 border border-gray-800 rounded-custom p-6 hover:border-primary/50 transition-all text-left">
            <TimePastIcon className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-lg font-normal mb-1">{agendamentos.length} AGENDAMENTOS</h3>
          </button>
          <button onClick={() => setActiveTab('favoritos')} className="bg-dark-100 border border-gray-800 rounded-custom p-6 hover:border-primary/50 transition-all text-left">
            <Heart filled size={32} className="text-red-500 mb-3" />
            <h3 className="text-lg font-normal mb-1">{favoritos.length} FAVORITOS</h3>
          </button>
          <button onClick={() => setActiveTab('dados')} className="bg-dark-100 border border-gray-800 rounded-custom p-6 hover:border-primary/50 transition-all text-left">
            <UserIcon className="w-8 h-8 text-primary mb-3" />
            <h3 className="text-lg font-normal mb-1">DADOS</h3>
          </button>
        </div>

        <div className="bg-dark-100 border border-gray-800 rounded-custom overflow-hidden">
          <div className="flex border-b border-gray-800">
            {['agendamentos', 'favoritos', 'dados'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 px-6 font-normal transition-all text-sm sm:text-base ${
                  activeTab === tab ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'agendamentos' ? 'AGENDAMENTOS' : tab === 'favoritos' ? 'FAVORITOS' : 'DADOS'}
              </button>
            ))}
          </div>

          <div className={activeTab === 'dados' ? '' : 'p-4 sm:p-6'}>
            <h2 className="sr-only">
              {activeTab === 'agendamentos' ? 'Agendamentos' : activeTab === 'favoritos' ? 'Favoritos' : 'Dados da conta'}
            </h2>

            {activeTab === 'agendamentos' && (
              <BookingsSection
                clienteNome={nomePerfil}
                groups={agendamentosPorStatus}
                hasMore={agendamentosHasMore}
                loadingMore={agendamentosLoadingMore}
                onLoadMore={carregarMaisAgendamentos}
                onCancel={cancelarAgendamento}
                onRebook={marcarNovamente}
                onOpenReview={abrirDepoimento}
                reviewsByBooking={avaliacoesPorAgendamento}
                reviewTarget={depoimentoAlvo}
                reviewRating={depoimentoNota}
                setReviewRating={setDepoimentoNota}
                reviewText={depoimentoTexto}
                setReviewText={setDepoimentoTexto}
                reviewLoading={depoimentoLoading}
                onSubmitReview={enviarDepoimentoAgendamento}
              />
            )}

            {activeTab === 'favoritos' && (
              <FavoritesSection
                favoritos={favoritos}
                removingFavoritoId={removingFavoritoId}
                hasMore={favoritosHasMore}
                loadingMore={favoritosLoadingMore}
                onRemove={removerFavorito}
                onLoadMore={carregarMaisFavoritos}
              />
            )}

            {activeTab === 'dados' && (
              <>
                <div className="flex items-start gap-3 border-b border-gray-800 px-4 py-3 sm:px-6">
                  <span className="w-[74px] shrink-0 py-2 text-[14px] leading-5 text-gray-500">NOME</span>
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={nomePerfil}
                      onChange={(e) => setNomePerfil(e.target.value)}
                      readOnly={!isDadosEditing('nome')}
                      className={`${dataInputClass} uppercase ${dadosInputStateClass(isDadosEditing('nome'))}`}
                      placeholder="NOME DO PERFIL"
                    />
                  </div>
                  {renderDadosAction('nome', salvarNome, savingPerfil)}
                </div>

                <div className="flex items-start gap-3 border-b border-gray-800 px-4 py-3 sm:px-6">
                  <span className="w-[74px] shrink-0 py-2 text-[14px] leading-5 text-gray-500">E-MAIL</span>
                  <div className="min-w-0 flex-1">
                    <input
                      type={emailVisivel || isDadosEditing('email') ? 'email' : 'text'}
                      value={isDadosEditing('email') ? novoEmail : maskedPrivateValue}
                      onChange={(e) => setNovoEmail(e.target.value)}
                      readOnly={!isDadosEditing('email')}
                      className={`${dataInputClass} uppercase truncate pr-2 ${dadosInputStateClass(isDadosEditing('email'))}`}
                      placeholder="E-MAIL DE ACESSO"
                    />
                  </div>
                  {renderDadosAction('email', salvarEmail, savingDados)}
                </div>

                <div className="flex items-start gap-3 border-b border-gray-800 px-4 py-3 sm:px-6">
                  <span className="w-[74px] shrink-0 py-2 text-[14px] leading-5 text-gray-500">TELEFONE</span>
                  <div className="min-w-0 flex-1">
                    <input
                      type="tel"
                      value={telefoneCliente}
                      onChange={(e) => setTelefoneCliente(e.target.value)}
                      readOnly={!isDadosEditing('telefone')}
                      className={`${dataInputClass} uppercase ${dadosInputStateClass(isDadosEditing('telefone'))}`}
                      placeholder="WHATSAPP"
                    />
                  </div>
                  {renderDadosAction('telefone', salvarTelefone, savingDados)}
                </div>

                <div className="px-4 py-3 sm:px-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-[14px] leading-5 text-gray-500">SENHA</span>
                    {renderDadosAction('senha', salvarSenha, savingDados)}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      readOnly={!isDadosEditing('senha')}
                      className={`${dataPillInputClass} ${dadosInputStateClass(isDadosEditing('senha'))}`}
                      placeholder="NOVA SENHA"
                    />
                    <input
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      readOnly={!isDadosEditing('senha')}
                      className={`${dataPillInputClass} ${dadosInputStateClass(isDadosEditing('senha'))}`}
                      placeholder="CONFIRMAR"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-800 px-4 py-4 sm:px-6">
                  <button
                    type="button"
                    onClick={handleExcluirContaCliente}
                    disabled={deletingAccount}
                    className="w-full rounded-full border border-red-500/30 py-3 text-center text-[12px] font-normal uppercase text-red-400 transition-colors hover:border-red-400/60 hover:text-red-300 disabled:opacity-50"
                  >
                    {deletingAccount ? 'EXCLUINDO' : 'EXCLUIR CONTA'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      <AppFooter userType={userType} onLogout={onLogout} />
    </div>
  );
}
