import { useRef, useState } from 'react';

export default function ScrollableCardsRow({
  items,
  keyExtractor,
  renderItem,
  cardClassName = 'bg-dark-200 border border-gray-800 rounded-custom p-4',
}) {
  const scrollerRef = useRef(null);
  const [activePage, setActivePage] = useState(0);
  const desktopPageCount = Math.max(1, Math.ceil(items.length / 3));

  function updateActivePage() {
    const node = scrollerRef.current;
    if (!node) return;

    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    const pageCount = isDesktop ? desktopPageCount : items.length;
    const cardsPerPage = isDesktop ? 3 : 1;
    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    const nextPage = maxScrollLeft <= 1
      ? 0
      : node.scrollLeft >= maxScrollLeft - 1
        ? pageCount - 1
        : (() => {
          const firstCard = node.firstElementChild;
          const secondCard = firstCard?.nextElementSibling;
          const cardStep = secondCard
            ? secondCard.offsetLeft - firstCard.offsetLeft
            : node.clientWidth;
          const cardIndex = Math.round(node.scrollLeft / Math.max(1, cardStep));
          return Math.max(0, Math.min(pageCount - 1, Math.floor(cardIndex / cardsPerPage)));
        })();
    setActivePage(Math.max(0, Math.min(pageCount - 1, nextPage)));
  }
  function goToDesktopPage(index) {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTo({ left: index * node.clientWidth, behavior: 'smooth' });
  }

  if (!Array.isArray(items) || items.length === 0) return null;

  const mobileActivePage = Math.min(activePage, items.length - 1);
  const desktopActivePage = Math.min(activePage, desktopPageCount - 1);

  return (
    <>
      <div
        ref={scrollerRef}
        onScroll={updateActivePage}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => (
          <div
            key={keyExtractor(item, index)}
            className={`shrink-0 basis-full snap-start lg:basis-[calc((100%-1.5rem)/3)] ${cardClassName}`}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
          {items.map((item, index) => (
            <span
              key={`dot-mobile-${keyExtractor(item, index)}`}
              className={`h-1.5 rounded-full transition-all ${index === mobileActivePage ? 'w-4 bg-primary' : 'w-1.5 bg-gray-600'}`}
            />
          ))}
        </div>
      )}

      {items.length > 3 && (
        <div className="mt-3 hidden justify-center gap-1.5 lg:flex">
          {Array.from({ length: desktopPageCount }).map((_, index) => (
            <button
              type="button"
              key={"dot-desktop-" + index}
              onClick={() => goToDesktopPage(index)}
              aria-label={"Ir para a pagina " + (index + 1)}
              title={"Ir para a pagina " + (index + 1)}
              className={index === desktopActivePage ? 'h-1.5 w-4 rounded-full bg-primary' : 'h-1.5 w-1.5 rounded-full bg-gray-600'}
            />
          ))}
        </div>
      )}
    </>
  );
}
