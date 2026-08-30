import EntregasCarousel from '../components/EntregasCarousel';

export default function VitrineEntregasSection({
  cards,
  sectionTitle,
  emptyListMsg,
  counterSingular,
  counterPlural,
  onLoadPage,
  booking,
}) {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-vcard2">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-normal mb-6">{sectionTitle}</h2>
        {cards.length === 0 ? (
          <p className="text-vmuted font-normal">{emptyListMsg}</p>
        ) : (
          <div className="space-y-4">
            {cards.map((card) => {
              return (
                <div key={card.id} className="bg-vcard border border-vborder rounded-custom p-6 hover:border-vprimary/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-normal text-lg uppercase">{card.nome}</div>
                    <div className="text-xs text-vmuted font-normal">{card.totalEntregas} {card.totalEntregas === 1 ? counterSingular : counterPlural}</div>
                  </div>
                  <EntregasCarousel
                    lista={card.lista}
                    pages={card.pages}
                    totalCount={card.totalEntregas}
                    loadingPage={card.loadingPage}
                    version={card.version}
                    onLoadPage={onLoadPage}
                    profissional={card.profissional}
                    selecaoProfId={booking.selecaoProfId}
                    servicosSelecionados={booking.servicosSelecionados}
                    isProfessional={booking.isProfessional}
                    onAgendarAgora={booking.onAgendarAgora}
                    onToggleSelecao={booking.onToggleSelecao}
                    emptyMsg={emptyListMsg}
                    isLight={booking.isLight}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
