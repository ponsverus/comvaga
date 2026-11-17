                          ? dayToday
                          : isDisabled
                            ? dayDisabled
                            : dayNormal,
                    ].join(' ')}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          )}

          {todayISO && selectedDay && (
            <div ref={slotsRef}>
              {slotsLoading && (
                <div className={`flex items-center justify-center py-8 ${loadingColor}`}>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm">BUSCANDO HORÁRIOS...</span>
                </div>
              )}

              {!slotsLoading && !slotsError && horariosAll.length > 0 && (() => {
                const hotHoras      = new Set(horariosHot.map(h => h.hora));
                const horariosExtra = horariosAll.filter(h => !hotHoras.has(h.hora));
                return (
                  <div>
                    {horariosHot.length > 0 ? (
                      <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
                          {horariosHot.map((h, i) => (
                            <SlotButton key={`hot-${i}`} slot={h} isSelected={selectedSlot?.hora === h.hora} onClick={handleSelectSlot} isLight={isLight} />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAll(v => !v)}
                          className={`w-full py-2.5 rounded-full border text-sm font-normal uppercase transition-colors ${showMoreBtn}`}
                        >
                          {showAll ? 'Ocultar horários' : 'Ver mais horários'}
                        </button>
                        {showAll && horariosExtra.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
                            {horariosExtra.map((h, i) => (
                              <SlotButton key={`extra-${i}`} slot={h} isSelected={selectedSlot?.hora === h.hora} onClick={handleSelectSlot} isLight={isLight} />
                            ))}
                          </div>
                        )}
                        {showAll && horariosExtra.length === 0 && (
                          <p className={`text-center text-xs mt-3 ${isLight ? 'text-gray-400' : 'text-gray-600'}`}>ESCOLHA ACIMA</p>
                        )}
                      </>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {horariosAll.map((h, i) => (
                          <SlotButton key={`all-${i}`} slot={h} isSelected={selectedSlot?.hora === h.hora} onClick={handleSelectSlot} isLight={isLight} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {todayISO && selectedSlot && (
            <div ref={resumeRef}>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming}
                className={`w-full py-3 rounded-button font-normal uppercase disabled:opacity-60 flex items-center justify-center gap-2 transition-colors ${confirmBtnClass}`}
              >
                {confirming
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</>
                  : <><CheckIcon className="w-4 h-4" /> Confirmar agendamento</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SlotButton({ slot, isSelected, onClick, isLight }) {
  const baseSelected  = 'bg-vprimary text-vprimary-text border-vprimary';
  const baseRaio      = isLight
    ? 'bg-gray-50 border-gray-300 hover:border-gray-900 text-gray-800'
    : 'bg-dark-200 border-gray-800 hover:border-primary text-white';
  const baseHeat      = isLight
    ? 'bg-gray-50 border-gray-900/40 text-gray-900 hover:bg-gray-100'
    : 'bg-dark-200 border-primary/40 text-primary hover:bg-primary/10';
  const baseNormal    = isLight
    ? 'bg-white border-gray-200 hover:border-gray-500 text-gray-700'
    : 'bg-dark-200 border-gray-800 hover:border-primary text-gray-300';

  return (
    <button
      type="button"
      onClick={() => onClick(slot)}
      className={[
        'relative min-h-9 rounded-full border py-2 text-sm uppercase font-normal text-center transition-colors',
        slot.isRaio && !isSelected ? 'pl-4 pr-7' : 'px-4',
        isSelected
          ? baseSelected
          : slot.isRaio
            ? baseRaio
            : slot.isHeat
              ? baseHeat
              : baseNormal,
      ].join(' ')}
    >
      {slot.isRaio && !isSelected && (
        <ZapIcon strokeWidth={1.5} className={`absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 ${isLight ? 'text-gray-700' : 'text-primary'}`} />
      )}
      <span className="tabular-nums normal-case">{slot.hora}</span>
    </button>
  );
}
