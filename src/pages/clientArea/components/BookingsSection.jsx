import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { supabase } from '../../../supabase';
import { ptBR } from '../../../feedback/messages/ptBR';
import { createHistoryPdfFile, loadHistoryPdfRenderer, shareHistoryPdf } from '../../../utils/agendamentoPdf';
import { CalendarIcon } from '../../../components/icons';
import ReviewStar from './ReviewStar';
import {
  formatDateBRFromISO,
  getStatusColor,
  getStatusText,
  getValorAgendamento,
  moneyBR,
} from '../utils';

function BookingGroup({
  title,
  items,
  reviewsByBooking,
  reviewTarget,
  reviewRating,
  setReviewRating,
  reviewText,
  setReviewText,
  reviewLoading,
  onCancel,
  onRebook,
  onOpenReview,
  onSubmitReview,
  shareState,
  onShare,
}) {
  if (!items.length) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs sm:text-sm text-gray-400 uppercase tracking-wide">{title}</div>
        <div className="text-xs text-gray-500">{items.length}</div>
      </div>
      <div className="space-y-4">
        {items.map((booking) => {
          const nomeProfissionalDepoimento = String(booking.profissionais?.nome || '').trim();
          const podeMarcarNovamente =
            ['concluido', 'cancelado_cliente', 'cancelado_profissional'].includes(String(booking.status || '')) &&
            !!booking.negocio_slug &&
            !!booking.profissional_id &&
            !!booking.entrega_id;
          const podeAvaliar =
            String(booking.status || '') === 'concluido' &&
            !reviewsByBooking[booking.id];
          const depoimentoAberto = podeAvaliar && reviewTarget?.id === booking.id;
          const podeCompartilhar = booking.status === 'concluido' || String(booking.status || '').includes('cancelado');
          const actionCount = Number(podeAvaliar) + Number(podeCompartilhar) + Number(podeMarcarNovamente) + Number(booking.status === 'agendado');
          const actionColumns = actionCount === 3 ? 'grid-cols-2 sm:grid-cols-3' : actionCount === 2 ? 'grid-cols-2' : 'grid-cols-1';

          return (
            <div key={booking.id} className="overflow-hidden bg-dark-200 border border-gray-800 rounded-custom">
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-normal text-white mb-1">{booking.profissionais?.negocios?.nome || '\u2014'}</h3>
                    <p className="text-sm text-gray-400 mb-2 uppercase">PROF: {booking.profissionais?.nome || '\u2014'}</p>
                    <p className="text-sm text-primary">{booking.entregas?.nome || '\u2014'}</p>
                  </div>
                  <div className={`shrink-0 inline-flex px-3 py-1 rounded-button text-xs border ${getStatusColor(booking.status)}`}>
                    {getStatusText(booking.status)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">DATA</div>
                    <div className="text-sm text-white">{formatDateBRFromISO(booking.data)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">{'HOR\u00c1RIO'}</div>
                    <div className="text-sm text-white">{booking.hora_inicio || '\u2014'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">VALOR</div>
                    <div className="text-sm text-white">R$ {moneyBR(getValorAgendamento(booking))}</div>
                  </div>
                </div>
                <div className={`grid items-stretch gap-2 ${actionColumns}`}>
                  {podeAvaliar && (
                    <button
                      type="button"
                      onClick={() => onOpenReview(booking)}
                      className="min-w-0 w-full px-2 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 rounded-button text-sm transition-all uppercase whitespace-normal break-words"
                    >
                      DAR DEPOIMENTO
                    </button>
                  )}
                  {podeCompartilhar && (
                      <button
                        type="button"
                        onClick={() => onShare(booking)}
                        disabled={!shareState.ready || shareState.sharingId !== null}
                        className="inline-flex min-w-0 w-full items-center justify-center gap-2 px-2 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary rounded-button text-sm transition-all uppercase disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Share2 size={16} className="shrink-0" aria-hidden="true" />
                        <span className="min-w-0 whitespace-normal break-words">{shareState.sharingId === booking.id ? 'COMPARTILHANDO...' : shareState.failed ? 'PDF INDISPON\u00cdVEL' : !shareState.ready ? 'PREPARANDO PDF...' : 'COMPARTILHAR'}</span>
                      </button>
                  )}
                  {booking.status === 'agendado' && (
                    <button
                      onClick={() => onCancel(booking.id)}
                      className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-button text-sm transition-all"
                    >
                      CANCELAR
                    </button>
                  )}
                  {podeMarcarNovamente && (
                    <button
                      onClick={() => onRebook(booking)}
                      className={`min-w-0 w-full px-2 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 rounded-button text-sm transition-all uppercase whitespace-normal break-words ${actionCount === 3 ? 'col-span-2 sm:col-span-1' : ''}`}
                    >
                      AGENDAR NOVAMENTE
                    </button>
                  )}
                </div>
                {shareState.errorId === booking.id && (
                  <p role="alert" className="mt-2 text-sm text-red-300">{'Falha ao compartilhar o PDF. Tente novamente.'}</p>
                )}
              </div>
              {depoimentoAberto && (
                <div className="border-t border-gray-800 px-3 py-3 sm:px-5">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex shrink-0 items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((nota) => (
                        <ReviewStar
                          key={nota}
                          active={reviewRating >= nota}
                          onClick={() => setReviewRating(nota)}
                          label={`${nota} estrela${nota > 1 ? 's' : ''}`}
                        />
                      ))}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <label className="shrink-0 whitespace-nowrap text-sm font-normal uppercase text-gray-500 sm:text-sm sm:tracking-wide">
                          {'Coment\u00e1rio:'}
                        </label>

                        <input
                          type="text"
                          value={reviewText}
                          onChange={(event) => setReviewText(event.target.value)}
                          placeholder="OPCIONAL"
                          className="min-w-[42px] flex-1 bg-transparent px-0 py-2 text-sm text-white placeholder-gray-600 outline-none focus:text-white"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={onSubmitReview}
                        disabled={reviewLoading}
                        className="w-full shrink-0 rounded-button border border-primary/50 bg-primary/20 px-4 py-2 text-sm font-normal uppercase text-primary transition-colors hover:bg-primary/30 hover:border-primary disabled:opacity-60 sm:w-auto sm:bg-transparent sm:px-4 sm:text-xs"
                      >
                        {reviewLoading
                          ? 'ENVIANDO...'
                          : `ENVIAR${nomeProfissionalDepoimento ? ` PARA ${nomeProfissionalDepoimento}` : ''}`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BookingsSection({
  clienteNome = '',
  groups,
  hasMore,
  loadingMore,
  onLoadMore,
  onCancel,
  onRebook,
  onOpenReview,
  reviewsByBooking,
  reviewTarget,
  reviewRating,
  setReviewRating,
  reviewText,
  setReviewText,
  reviewLoading,
  onSubmitReview,
}) {
  const [renderer, setRenderer] = useState(null);
  const [groupsByType, setGroupsByType] = useState({});
  const [preparationFailed, setPreparationFailed] = useState(false);
  const [sharingId, setSharingId] = useState(null);
  const [errorId, setErrorId] = useState(null);
  const shareLock = useRef(false);
  const typeRequests = useRef(new Map());
  const typesKey = JSON.stringify([...new Set([...groups.concluidos, ...groups.cancelados]
    .map((booking) => booking.profissionais?.negocios?.tipo_negocio)
    .filter((type) => typeof type === 'string' && type.trim()))].sort());

  useEffect(() => {
    let active = true;
    loadHistoryPdfRenderer().then((value) => {
      if (active) setRenderer(value);
    }).catch((error) => {
      console.error('Falha ao preparar PDF do cliente.', error);
      if (active) setPreparationFailed(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const types = JSON.parse(typesKey);
    Promise.all(types.map((type) => {
      if (!typeRequests.current.has(type)) {
        typeRequests.current.set(type, supabase.rpc('tipo_negocio_grupo', { p_tipo: type })
          .then(({ data, error }) => {
            if (error) throw error;
            if (!['servicos', 'consultas', 'aulas'].includes(data)) throw new Error('Grupo de atendimento desconhecido');
            return [type, data];
          }).catch((error) => {
            typeRequests.current.delete(type);
            throw error;
          }));
      }
      return typeRequests.current.get(type);
    })).then((entries) => {
      if (active) setGroupsByType(Object.fromEntries(entries));
    }).catch((error) => {
      console.error('Falha ao preparar termos do PDF.', error);
      if (active) setPreparationFailed(true);
    });
    return () => { active = false; };
  }, [typesKey]);

  const ready = !!renderer && !preparationFailed && JSON.parse(typesKey).every((type) => groupsByType[type]);
  const shareState = { ready, failed: preparationFailed, sharingId, errorId };
  const onShare = async (booking) => {
    if (!ready || shareLock.current) return;
    shareLock.current = true;
    setSharingId(booking.id);
    setErrorId(null);
    try {
      const negocio = booking.profissionais?.negocios;
      const group = groupsByType[negocio?.tipo_negocio] || 'servicos';
      const file = createHistoryPdfFile(renderer, {
        filename: `agendamento-${booking.id}.pdf`,
        fields: [
          ['NEG\u00d3CIO', negocio?.nome],
          ['CLIENTE', clienteNome],
          ['PROFISSIONAL', booking.profissionais?.nome],
          [ptBR.dashboard.business.item_singular[group].toUpperCase(), booking.entregas?.nome],
          ['DATA', formatDateBRFromISO(booking.data)],
          ['HOR\u00c1RIO', booking.hora_inicio],
          ['VALOR', `R$ ${moneyBR(getValorAgendamento(booking))}`],
          ['STATUS', getStatusText(booking.status)],
        ],
      });
      await shareHistoryPdf(file);
    } catch (error) {
      console.error('Falha ao compartilhar PDF do cliente.', error);
      setErrorId(booking.id);
    } finally {
      shareLock.current = false;
      setSharingId(null);
    }
  };
  const hasBookings = groups.abertos.length || groups.cancelados.length || groups.concluidos.length;

  return (
    <div>
      {preparationFailed && (
        <p role="alert" className="mb-4 text-sm text-red-300">{'Falha ao preparar o PDF. Recarregue a p\u00e1gina e tente novamente.'}</p>
      )}
      {hasBookings ? (
        <>
          <BookingGroup
            title="EM ABERTO"
            shareState={shareState}
            onShare={onShare}
            items={groups.abertos}
            reviewsByBooking={reviewsByBooking}
            reviewTarget={reviewTarget}
            reviewRating={reviewRating}
            setReviewRating={setReviewRating}
            reviewText={reviewText}
            setReviewText={setReviewText}
            reviewLoading={reviewLoading}
            onCancel={onCancel}
            onRebook={onRebook}
            onOpenReview={onOpenReview}
            onSubmitReview={onSubmitReview}
          />
          <BookingGroup
            title={'CONCLU\u00cdDOS'}
            shareState={shareState}
            onShare={onShare}
            items={groups.concluidos}
            reviewsByBooking={reviewsByBooking}
            reviewTarget={reviewTarget}
            reviewRating={reviewRating}
            setReviewRating={setReviewRating}
            reviewText={reviewText}
            setReviewText={setReviewText}
            reviewLoading={reviewLoading}
            onCancel={onCancel}
            onRebook={onRebook}
            onOpenReview={onOpenReview}
            onSubmitReview={onSubmitReview}
          />
          <BookingGroup
            title="CANCELADOS"
            shareState={shareState}
            onShare={onShare}
            items={groups.cancelados}
            reviewsByBooking={reviewsByBooking}
            reviewTarget={reviewTarget}
            reviewRating={reviewRating}
            setReviewRating={setReviewRating}
            reviewText={reviewText}
            setReviewText={setReviewText}
            reviewLoading={reviewLoading}
            onCancel={onCancel}
            onRebook={onRebook}
            onOpenReview={onOpenReview}
            onSubmitReview={onSubmitReview}
          />
        </>
      ) : (
        <div className="flex flex-col items-center py-12 gap-4">
          <CalendarIcon className="block w-16 h-16 text-gray-500 opacity-40" />
          <Link to="/" className="inline-block px-6 py-3 bg-gradient-to-r from-primary to-yellow-600 text-black rounded-button hover:shadow-lg transition-all">
            AGENDAR
          </Link>
        </div>
      )}
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="mt-2 w-full py-2 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary rounded-button text-sm font-normal uppercase disabled:opacity-60"
        >
          {loadingMore ? 'CARREGANDO...' : 'CARREGAR MAIS'}
        </button>
      )}
    </div>
  );
}
