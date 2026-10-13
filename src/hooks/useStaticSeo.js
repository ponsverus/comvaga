import { useEffect } from 'react';
import { applyMetadata } from '../utils/seoMetadata.js';
import { STATIC_SEO } from '../utils/staticSeo.js';

export function useStaticSeo(path) {
  useEffect(() => applyMetadata(STATIC_SEO[path]), [path]);
}
