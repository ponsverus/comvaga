import { useEffect, useRef, useState } from 'react';
import ModalDialog from '../../../components/ModalDialog';

export default function VitrineGallerySection({ items, hasMore = false, loadingMore = false, onLoadMore }) {
  const sentinelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loadingMore || typeof onLoadMore !== 'function') return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
    }, { rootMargin: '600px 0px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  if (!items.length) return null;

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-px">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Ampliar imagem ${index + 1} da galeria`}
              onClick={(event) => {
                event.currentTarget.focus();
                setSelectedImage({ url: item.url, alt: `Imagem ${index + 1} da galeria` });
              }}
              className="mb-px block w-full break-inside-avoid overflow-hidden rounded-custom border border-vborder bg-vcard cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vtext"
            >
              <img src={item.url} alt="" className="w-full h-auto object-contain bg-vbg" loading="lazy" />
            </button>
          ))}
        </div>
        {hasMore && (
          <div ref={sentinelRef} className="flex h-12 items-center justify-center" aria-hidden="true">
            {loadingMore && <div className="h-5 w-5 rounded-full border-2 border-vborder border-t-vtext animate-spin" />}
          </div>
        )}
      </div>
      <ModalDialog
        open={Boolean(selectedImage)}
        onDismiss={() => setSelectedImage(null)}
        labelledBy="vitrine-gallery-image-title"
        initialFocusRef={closeButtonRef}
        overlayClassName="bg-black/95"
        paddingClassName="p-0"
      >
        <div className="relative flex min-h-dvh w-full items-center justify-center px-4 pb-4 pt-16 sm:px-6 sm:pb-6">
          <h2 id="vitrine-gallery-image-title" className="sr-only">Imagem da galeria ampliada</h2>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Fechar imagem ampliada"
            onClick={() => setSelectedImage(null)}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center text-4xl leading-none text-white transition-colors hover:text-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6 sm:top-6"
          >
            ×
          </button>
          {selectedImage && (
            <img
              src={selectedImage.url}
              alt={selectedImage.alt}
              className="max-h-[calc(100dvh-5rem)] max-w-full object-contain"
            />
          )}
        </div>
      </ModalDialog>
    </section>
  );
}
