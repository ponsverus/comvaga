import { serveVitrine } from '../server/publicSeo.js';

export default function handler(req, res) {
  return serveVitrine(req, res);
}
