import { serveNotFound } from '../server/publicSeo.js';

export default function handler(req, res) {
  return serveNotFound(req, res);
}
