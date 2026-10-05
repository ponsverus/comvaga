# SEO das vitrines

As rotas públicas usam metadados no HTML inicial para todos os visitantes,
sem detecção de robôs. O conteúdo interativo continua sendo renderizado pelo
React; esta implementação não transforma toda a aplicação em SSR.

## Publicação

1. Publique os arquivos de frontend, `api/`, `server/`, `index.html`,
   `vercel.json`, `vite.config.js` e os arquivos públicos juntos.
2. Envie `public/og-default.png` como arquivo binário, não como texto.
3. As funções usam as variáveis existentes `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` na Vercel. Alternativamente, aceitam
   `SUPABASE_URL` e `SUPABASE_ANON_KEY`. Nunca configure uma chave service_role.
4. A migração `public_business_seo_and_sitemap` cria duas RPCs públicas
   limitadas. O SQL correspondente está em `sql/public_business_seo.sql`.
   Não é necessário reaplicá-lo se a migração já foi executada no projeto.

## Regras

- Título: campo SEO; caso vazio, nome, categoria e cidade conforme espaço.
- Descrição: campo SEO; descrição original da vitrine; composição automática.
- Os serviços da composição automática vêm da mesma consulta tanto no
  navegador quanto no servidor, sem depender da página atual do carrossel.
- Canonical e og:url são URLs completas no domínio comvaga.com.br.
- Imagem: logo acessível no Storage; caso ausente ou indisponível, imagem padrão.
- Cache na CDN: cinco minutos para vitrines, dez para sitemap. Navegadores
  revalidam. Falhas não são armazenadas no cache.
- Slug inexistente retorna 404. Falha de dependência retorna 503, não um falso 404.
- Sitemap inclui apenas rotas públicas e slugs válidos. Não inventa lastmod.
- Os limites das novas consultas usam os contadores existentes, com baldes
  próprios, sem modificar as proteções dos demais fluxos.
- Não há novas colunas, alteração de RLS nem acesso a dados de agendamentos.

## Conferência após publicar

Confira o HTML de resposta de duas vitrines, sem depender do inspetor DOM:
título, descrição, canonical e og:* devem estar presentes e ser específicos.
Abra /robots.txt, /sitemap.xml e /sitemap-1.xml. Teste uma vitrine inexistente
e o compartilhamento de uma vitrine com e sem logo. Cadastre /sitemap.xml no
Search Console e solicite indexação das vitrines que desejar verificar.

Bloqueios 429 do firewall da Vercel são uma investigação separada; esta
mudança não desativa nem contorna o firewall. Prévia e indexação dependem
também dos caches e decisões das plataformas, não apenas dessas etiquetas.

## Testes locais

`node --test tests/publicSeo.test.mjs`

`npm run lint`

`npm run build`

O plugin de desenvolvimento serve as mesmas rotas usando as RPCs públicas.
