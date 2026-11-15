import { CalendarIcon } from '../../../components/icons';

export default function BookingConfirmedModal({
  open,
  booking,
  styles,
  calendarActionConfig,
  formatDateBR,
  onClose,
  navigate,
  assistedBooking = false,
  assistedReturnTo = '/dashboard',
  negocioId = null,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`border rounded-custom max-w-md w-full ${styles.bg}`}>
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><CalendarIcon className="w-10 h-10 text-green-500" /></div>
          <h3 className={`text-2xl font-normal mb-2 ${styles.title}`}>AGENDADO :)</h3>
          <p className="font-normal mb-1">
            {booking.lastSlot?.label && <span className={`font-normal ${styles.hora}`}>{booking.lastSlot.label}</span>}
            {booking.lastSlot?.dataISO && <span className={styles.data}> • {formatDateBR(booking.lastSlot.dataISO)}</span>}
          </p>
          {!assistedBooking && (
            <div className={`rounded-custom border p-4 text-left mb-6 ${styles.box}`}>
              <p className={`font-normal text-base mb-3 ${styles.sub}`}> Crie um lembrete no seu celular para assegurar o compromisso.</p>
              {calendarActionConfig.hint && (
                <p className={`font-normal text-xs uppercase mb-4 ${styles.hint}`}>{calendarActionConfig.hint}</p>
              )}
              <button type="button" onClick={calendarActionConfig.primaryAction} className={`w-full py-4 rounded-button uppercase font-normal transition-colors ${styles.actionBtn}`}>
                {calendarActionConfig.primaryLabel}
              </button>
              {calendarActionConfig.secondaryAction && (
                <button
                  type="button"
                  onClick={calendarActionConfig.secondaryAction}
                  className={`w-full py-3 rounded-button uppercase font-normal mt-3 transition-colors border ${styles.secondaryBtn}`}
                >
                  {calendarActionConfig.secondaryLabel}
                </button>
              )}
            </div>
          )}
          {assistedBooking ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(assistedReturnTo, { state: { negocioId, activeTab: 'clientes' } });
              }}
              className="w-full py-3 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary rounded-button uppercase font-normal transition-colors"
            >
              VOLTAR AO DASHBOARD
            </button>
          ) : (
            <button type="button" onClick={() => { onClose(); navigate('/minha-area'); }} className="w-full py-3 bg-transparent border border-red-500 text-red-500 rounded-button uppercase font-normal hover:bg-red-500/10 transition-colors">PREFIRO ESQUECER</button>
          )}
        </div>
      </div>
    </div>
  );
}
