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
    const nextPage = Math.round(node.scrollLeft / Math.max(1, node.clientWidth));
    setActivePage(Math.max(0, Math.min(pageCount - 1, nextPage)));
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
        <div className="mt-3 hidden justify-center gap-1.5 lg:flex" aria-hidden="true">
          {Array.from({ length: desktopPageCount }).map((_, index) => (
            <span
              key={`dot-desktop-${index}`}
              className={`h-1.5 rounded-full transition-all ${index === desktopActivePage ? 'w-4 bg-primary' : 'w-1.5 bg-gray-600'}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
