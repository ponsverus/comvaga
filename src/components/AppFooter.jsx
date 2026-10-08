import { Link, useLocation } from 'react-router-dom';
import { getSupportHref } from '../support';

function FooterLink({ to, href, children, onClick }) {
  const className = 'text-gray-500 hover:text-primary transition-colors text-sm uppercase';

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }

  if (href) {
    return (
      <a href={href} target={href.startsWith('https://wa.me/') ? '_blank' : undefined} rel={href.startsWith('https://wa.me/') ? 'noreferrer' : undefined} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

export default function AppFooter({
  userType = null,
  professionalRole = null,
  onLogout,
}) {
  const { pathname } = useLocation();
  const isClient = userType === 'client';
  const isProfessional = userType === 'professional';
  const isPartner = professionalRole === 'partner';
  const professionalHomePath = isPartner ? '/selecionar-negocio-parceiro' : '/selecionar-negocio';
  const professionalHomeLabel = isPartner ? 'SELECIONAR PARCERIA' : 'SELECIONAR NEGÓCIO';
  const showClientAreaLink = isClient && pathname !== '/minha-area';
  const supportHref = getSupportHref(userType);

  return (
    <footer className="bg-black py-12 px-4 border-t border-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="flex flex-col justify-start">
            <Link to="/" className="inline-block hover:opacity-75 transition-opacity">
              <img
                src="/Comvaga Logo.png"
                alt="Comvaga"
                className="h-16 w-auto object-contain"
              />
            </Link>
            <p className="text-gray-600 text-xs mt-3 uppercase leading-relaxed">
              Sua agenda,<br />matematicamente perfeita.
            </p>
          </div>

          <div>
            <h2 className="text-white font-normal mb-4">PARA VOCÊ</h2>
            <ul className="space-y-2">
              {isProfessional ? (
                <>
                  <li><FooterLink to={professionalHomePath}>{professionalHomeLabel}</FooterLink></li>
                  <li><FooterLink to="/conta-profissional">MINHA CONTA</FooterLink></li>
                  <li><FooterLink href={supportHref}>SUPORTE</FooterLink></li>
                  <li><FooterLink onClick={() => onLogout?.()}>SAIR</FooterLink></li>
                </>
              ) : isClient ? (
                <>
                  {showClientAreaLink && <li><FooterLink to="/minha-area">MINHA ÁREA</FooterLink></li>}
                  <li><FooterLink to="/">HOME</FooterLink></li>
                  <li><FooterLink href={supportHref}>SUPORTE</FooterLink></li>
                  <li><FooterLink onClick={() => onLogout?.()}>SAIR</FooterLink></li>
                </>
              ) : (
                <>
                  <li><FooterLink to="/login">LOGIN</FooterLink></li>
                  <li><FooterLink to="/cadastro">CADASTRAR GRÁTIS</FooterLink></li>
                  <li><FooterLink to="/login/parceiro">LOGIN PARCEIRO</FooterLink></li>
                  <li><FooterLink to="/cadastro/parceiro">CADASTRO PARCEIRO</FooterLink></li>
                  <li><FooterLink href={supportHref}>SUPORTE</FooterLink></li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h2 className="text-white font-normal mb-4">EMPRESA</h2>
            <ul className="space-y-2">
              <li><FooterLink to="/sobre">SOBRE</FooterLink></li>
              <li><FooterLink href="#">BLOG</FooterLink></li>
            </ul>
          </div>

          <div>
            <h2 className="text-white font-normal mb-4">LEGAL</h2>
            <ul className="space-y-2">
              <li><FooterLink to="/privacidade">PRIVACIDADE</FooterLink></li>
              <li><FooterLink to="/termos">TERMOS</FooterLink></li>
            </ul>
          </div>
        </div>

        <div className="pt-6">
          <p className="text-gray-600 text-sm">© 2026 COMVAGA. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
