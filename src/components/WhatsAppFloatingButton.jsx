import { useLocation } from 'react-router-dom';
import MessageIcon from './icons/MessageIcon';
import { getSupportHref } from '../support';

// Áreas logadas/internas do sistema: o ícone flutuante não deve aparecer aqui.
// O suporte dentro dessas áreas continua disponível pelo link fixo no footer.
const PRIVATE_PATH_PREFIXES = [
  '/dashboard',
  '/minha-area',
  '/criar-negocio',
  '/selecionar-negocio',
  '/selecionar-negocio-parceiro',
  '/conta-profissional',
  '/cadastro/profissional/retomada',
];

function isPrivatePath(pathname) {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function WhatsAppFloatingButton() {
  const { pathname } = useLocation();

  if (isPrivatePath(pathname)) return null;

  // Mensagem sempre "aberta": em página pública ainda não sabemos
  // se quem está entrando em contato é cliente ou profissional.
  const href = getSupportHref('public');

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Fale conosco pelo WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
    >
      <MessageIcon size={28} title="Fale conosco pelo WhatsApp" />
    </a>
  );
}
