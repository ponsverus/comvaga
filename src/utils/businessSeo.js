export const SEO_TITLE_LIMIT = 60;
export const SEO_DESCRIPTION_LIMIT = 160;

export function normalizeSeoText(value) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim();
}

function shorten(value, limit) {
  const chars = Array.from(value);
  if (chars.length <= limit) return value;
  const prefix = chars.slice(0, limit - 3).join('');
  const boundary = prefix.lastIndexOf(' ');
  return `${(boundary > 0 ? prefix.slice(0, boundary) : prefix).trimEnd()}...`;
}

function comparisonText(value) {
  return normalizeSeoText(value).normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}

export function buildBusinessSeo(negocio, entregas = []) {
  entregas = Array.isArray(negocio?.seo_services) ? negocio.seo_services : entregas;
  const nome = normalizeSeoText(negocio?.nome);
  const tipo = normalizeSeoText(negocio?.tipo_negocio).toLocaleLowerCase('pt-BR');
  const cidade = normalizeSeoText(negocio?.endereco_cidade);
  const includesType = tipo && ` ${comparisonText(nome)} `.includes(` ${comparisonText(tipo)} `);
  const category = includesType ? '' : tipo;
  const location = category && cidade ? `${category} em ${cidade}` : category || cidade;
  let automaticTitle = [nome || 'Comvaga', location].filter(Boolean).join(' | ');
  if (Array.from(automaticTitle).length > SEO_TITLE_LIMIT) {
    automaticTitle = [nome || 'Comvaga', category].filter(Boolean).join(' | ');
  }
  if (Array.from(automaticTitle).length > SEO_TITLE_LIMIT) automaticTitle = nome || 'Comvaga';
  if (Array.from(`${automaticTitle} | Comvaga`).length <= SEO_TITLE_LIMIT && nome) automaticTitle += ' | Comvaga';
  const services = [...new Set(entregas.filter((item) => item?.ativo === true && !item.excluido_em && !item.motivo_excluido).map((item) => normalizeSeoText(item.nome)).filter(Boolean))].slice(0, 3);
  let automaticDescription = nome
    ? `Agende online com ${nome}${location ? ` (${location})` : ''} pela Comvaga.`
    : 'Agende online pela Comvaga.';
  if (nome && services.length) {
    const prefix = [nome, location].filter(Boolean).join(' | ');
    const serviceDescription = `${prefix}. Serviços: ${services.join(', ')}. Agende online.`;
    if (Array.from(serviceDescription).length <= SEO_DESCRIPTION_LIMIT) automaticDescription = serviceDescription;
  }
  return {
    title: shorten(normalizeSeoText(negocio?.seo_title) || automaticTitle, SEO_TITLE_LIMIT),
    description: shorten(normalizeSeoText(negocio?.seo_description) || normalizeSeoText(negocio?.descricao) || automaticDescription, SEO_DESCRIPTION_LIMIT),
  };
}
