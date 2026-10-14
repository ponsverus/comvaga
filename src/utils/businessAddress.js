const BRAZILIAN_STATES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo',
  SE: 'Sergipe', TO: 'Tocantins',
};

export function formatBrazilianPostalCode(value) {
  const raw = String(value ?? '').trim();
  if (!/^\d{5}-?\d{3}$/.test(raw)) return null;
  const digits = raw.replace('-', '');
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function getBusinessAddressRows(business) {
  const state = String(business?.endereco_estado ?? '').trim();
  const stateCode = state.toUpperCase();
  const formattedState = BRAZILIAN_STATES[stateCode]
    ? `${BRAZILIAN_STATES[stateCode]} (${stateCode})`
    : state;

  return [
    ['Logradouro', business?.endereco_rua],
    ['Número', business?.endereco_numero],
    ['Complemento', business?.endereco_complemento],
    ['Bairro', business?.endereco_bairro],
    ['Cidade', business?.endereco_cidade],
    ['Estado', formattedState],
    ['CEP', formatBrazilianPostalCode(business?.endereco_cep)],
  ].filter(([, value]) => value != null && String(value).trim())
    .map(([label, value]) => [label, String(value).trim()]);
}
