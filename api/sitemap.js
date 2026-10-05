import { serveSitemap } from '../server/publicSeo.js';

export default function handler(req, res) {
  return serveSitemap(req, res);
}
