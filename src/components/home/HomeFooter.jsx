import { Link } from 'react-router-dom';

export default function HomeFooter({
  isLogged,
  loggedAreaLink,
  loggedAreaLabel,
  supportHref,
  handleLogoutClick,
}) {
  return (
    <footer className="bg-black py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="flex flex-col justify-start">
            <Link to="/" className="inline-block hover:opacity-75 transition-opacity">
              <img
                src="/comvaga-logo.png"
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
              {isLogged ? (
                <>
                  <li>
                    <Link
                      to={loggedAreaLink}
                      className="text-gray-500 hover:text-primary transition-colors text-sm"
                    >
                      {loggedAreaLabel}
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={handleLogoutClick}
                      className="text-gray-500 hover:text-primary transition-colors text-sm"
                    >
                      SAIR
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="text-gray-500 hover:text-primary transition-colors text-sm">
                      LOGIN
                    </Link>
                  </li>
                  <li>
                    <Link to="/cadastro" className="text-gray-500 hover:text-primary transition-colors text-sm">
                      CADASTRAR GRÁTIS
                    </Link>
                  </li>
                  <li>
                    <Link to="/login/parceiro" className="text-gray-500 hover:text-primary transition-colors text-sm">
                      LOGIN PARCEIRO
                    </Link>
                  </li>
                  <li>
                    <Link to="/cadastro/parceiro" className="text-gray-500 hover:text-primary transition-colors text-sm">
                      CADASTRO PARCEIRO
                    </Link>
                  </li>
                </>
              )}
              <li>
                <a
                  href={supportHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-500 hover:text-primary transition-colors text-sm"
                >
                  SUPORTE
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-white font-normal mb-4">EMPRESA</h2>
            <ul className="space-y-2">
              <li>
                <Link to="/sobre" className="text-gray-400 hover:text-primary transition-colors text-sm">
                  SOBRE
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-gray-400 hover:text-primary transition-colors text-sm">
                  BLOG
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-white font-normal mb-4">LEGAL</h2>
            <ul className="space-y-2">
              <li>
                <Link to="/privacidade" className="text-gray-500 hover:text-primary transition-colors text-sm">
                  PRIVACIDADE
                </Link>
              </li>
              <li>
                <Link to="/termos" className="text-gray-500 hover:text-primary transition-colors text-sm">
                  TERMOS
                </Link>
              </li>
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
