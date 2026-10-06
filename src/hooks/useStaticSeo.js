import { useEffect } from 'react';
import { applyBusinessMetadata } from '../utils/businessSeoMetadata.js';
import { STATIC_SEO } from '../utils/staticSeo.js';

export function useStaticSeo(path) {
  useEffect(() => applyBusinessMetadata(STATIC_SEO[path]), [path]);
}
