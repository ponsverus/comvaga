import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import TemaToggle from '../components/TemaToggle';
import { SEO_TITLE_LIMIT, SEO_DESCRIPTION_LIMIT } from '../../../utils/businessSeo';

function InfoRow({ label, children, action, last = false }) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 sm:px-6 ${last ? '' : 'border-b border-gray-800'}`}>
      <span className="w-[86px] shrink-0 py-2 text-[14px] leading-5 text-gray-500">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

function SplitRow({ children, last = false }) {
  return (
    <div className={`grid grid-cols-2 ${last ? '' : 'border-b border-gray-800'}`}>
      {children}
    </div>
  );
}

function SplitField({ label, children, divider = false }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 sm:px-6 ${divider ? 'border-r border-gray-800' : ''}`}>
      <label className="w-[62px] shrink-0 text-[14px] leading-5 text-gray-500">{label}</label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const inputClass = 'w-full bg-transparent px-0 py-2 text-[14px] text-white placeholder-gray-600 outline-none focus:text-white';
const editButtonClass = 'shrink-0 rounded-full bg-primary px-3 py-1 text-[12px] font-normal uppercase text-black transition-colors hover:bg-primary/90 disabled:opacity-50';
const saveButtonClass = 'shrink-0 rounded-full border border-primary/30 px-3 py-1 text-[12px] font-normal uppercase text-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40';
const iconButtonClass = 'inline-flex shrink-0 items-center justify-center p-1 text-gray-400 transition-colors hover:text-primary';
const maskedPrivateValue = '••••••••';
const aboutFields = [
  'descricao',
  'endereco_cep',
  'endereco_bairro',
  'endereco_rua',
  'endereco_numero',
  'endereco_complemento',
  'endereco_cidade',
  'endereco_estado',
];

function normalizedFieldValue(value) {
  return String(value ?? '');
}

export default function InfoNegocioSection({
  salvarInfoNegocio,
  infoSaving,
  formInfo,
  setFormInfo,
  salvarTema,
  temaSaving,
  galleryUploading,
  uploadGaleria,
  galeriaItems,
  galeriaHasMore,
  galeriaLoadingMore,
  loadMoreGaleria,
  getPublicUrl,
  excluirImagemGaleria,
  deletingBusiness,
  excluirNegocio,
  navigate,
}) {
  const [sobreExpanded, setSobreExpanded] = useState(false);
  const [googleExpanded, setGoogleExpanded] = useState(false);
  const [visiblePrivateFields, setVisiblePrivateFields] = useState({
    instagram: false,
    facebook: false,
  });
  const [editingFields, setEditingFields] = useState({});
  const [fieldBaselines, setFieldBaselines] = useState({});
  const [savingBusinessField, setSavingBusinessField] = useState(null);
  const gallerySentinelRef = useRef(null);

  useEffect(() => {
    const node = gallerySentinelRef.current;
    if (!node || !galeriaHasMore || galeriaLoadingMore || typeof loadMoreGaleria !== 'function') return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreGaleria();
    }, { rootMargin: '600px 0px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, [galeriaHasMore, galeriaLoadingMore, loadMoreGaleria]);

  const getBusinessFieldValue = (field) => {
    if (field === 'google') return JSON.stringify(['seo_title', 'seo_description'].map((key) => normalizedFieldValue(formInfo[key])));
    if (field === 'sobre') {
      return JSON.stringify(aboutFields.map((key) => normalizedFieldValue(formInfo[key])));
    }
    return normalizedFieldValue(formInfo[field]);
  };

  const isEditing = (field) => Boolean(editingFields[field]);
  const fieldChanged = (field) => isEditing(field) && fieldBaselines[field] !== getBusinessFieldValue(field);

  const startEditing = (field) => {
    if (field === 'google') setGoogleExpanded(true);
    if (field === 'sobre') setSobreExpanded(true);
    if (field === 'instagram' || field === 'facebook') {
      setVisiblePrivateFields((current) => ({ ...current, [field]: true }));
    }
    setFieldBaselines((current) => ({ ...current, [field]: getBusinessFieldValue(field) }));
    setEditingFields((current) => ({ ...current, [field]: true }));
  };

  const stopEditing = (field) => {
    if (field === 'instagram' || field === 'facebook') {
      setVisiblePrivateFields((current) => ({ ...current, [field]: false }));
    }
    setEditingFields((current) => ({ ...current, [field]: false }));
    setFieldBaselines((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const saveBusinessField = async (field) => {
    if (!fieldChanged(field)) return;
    try {
      setSavingBusinessField(field);
      const saved = await Promise.resolve(salvarInfoNegocio());
      if (saved !== false) stopEditing(field);
    } finally {
      setSavingBusinessField(null);
    }
  };

  const businessFieldAction = (field) => (
    isEditing(field) ? (
      <button type="button" onClick={() => saveBusinessField(field)} disabled={infoSaving || !fieldChanged(field)} className={saveButtonClass}>
        {savingBusinessField === field ? 'SALVANDO' : 'SALVAR'}
      </button>
    ) : (
      <button type="button" onClick={() => startEditing(field)} disabled={infoSaving} className={editButtonClass}>
        EDITAR
      </button>
    )
  );

  const inputStateClass = (editing) => editing ? '' : 'cursor-default text-gray-300 focus:text-gray-300';

  const addressTextInput = (field, placeholder = '', extraClass = '') => (
    <input
      value={formInfo[field] || ''}
      onChange={(e) => setFormInfo((prev) => ({ ...prev, [field]: e.target.value }))}
      readOnly={!isEditing('sobre')}
      className={`${inputClass} truncate ${inputStateClass(isEditing('sobre'))} ${extraClass}`}
      placeholder={placeholder}
    />
  );

  return (
    <div className="-m-6">
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-3 sm:px-6">
        <span className="w-[86px] shrink-0 text-[14px] leading-5 text-gray-500">TEMA</span>
        <div className="min-w-0 flex-1">
          <TemaToggle value={formInfo.tema} onChange={salvarTema} loading={temaSaving} />
        </div>
        <span className="shrink-0 text-[12px] uppercase text-gray-600">
          {temaSaving ? 'SALVANDO' : ''}
        </span>
      </div>

      <InfoRow label="NEGÓCIO" action={businessFieldAction('nome')}>
        <input
          value={formInfo.nome}
          onChange={(e) => setFormInfo((prev) => ({ ...prev, nome: e.target.value }))}
          readOnly={!isEditing('nome')}
          className={`${inputClass} uppercase truncate pr-10 sm:pr-0 ${inputStateClass(isEditing('nome'))}`}
          placeholder="NOME DO NEGÓCIO"
        />
      </InfoRow>

      <InfoRow label="TELEFONE" action={businessFieldAction('telefone')}>
        <input
          value={formInfo.telefone}
          onChange={(e) => setFormInfo((prev) => ({ ...prev, telefone: e.target.value }))}
          readOnly={!isEditing('telefone')}
          className={`${inputClass} ${inputStateClass(isEditing('telefone'))}`}
          placeholder="WHATSAPP"
        />
      </InfoRow>

      <div className={`border-b border-gray-800 px-4 pt-3 sm:px-6 ${sobreExpanded ? 'pb-0' : 'pb-3'}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px] leading-5 text-gray-500">SOBRE</span>
          {sobreExpanded ? (
            businessFieldAction('sobre')
          ) : (
            <button
              type="button"
              onClick={() => setSobreExpanded(true)}
              className={iconButtonClass}
              aria-expanded={sobreExpanded}
              aria-label="Expandir sobre"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
        {sobreExpanded ? (
          <>
            <textarea
              value={formInfo.descricao}
              onChange={(e) => setFormInfo((prev) => ({ ...prev, descricao: e.target.value }))}
              readOnly={!isEditing('sobre')}
              rows={4}
              className={`max-h-32 w-full resize-none overflow-y-auto bg-transparent py-2 pl-0 pr-6 text-[14px] font-normal leading-5 text-white outline-none [scrollbar-width:none] placeholder-gray-600 focus:text-white sm:pr-0 [&::-webkit-scrollbar]:hidden ${inputStateClass(isEditing('sobre'))}`}
              placeholder="Conte sobre seu negócio, atendimento e diferenciais; até 150 caracteres."
            />

            <div className="-mx-4 mt-3 border-t border-gray-800 sm:-mx-6">
              <SplitRow>
                <SplitField label="CEP" divider>
                  {addressTextInput('endereco_cep')}
                </SplitField>
                <SplitField label="BAIRRO">
                  {addressTextInput('endereco_bairro')}
                </SplitField>
              </SplitRow>

              <SplitRow>
                <SplitField label="RUA" divider>
                  {addressTextInput('endereco_rua')}
                </SplitField>
                <SplitField label="NÚMERO">
                  {addressTextInput('endereco_numero')}
                </SplitField>
              </SplitRow>

              <div className="border-b border-gray-800 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-3">
                  <label className="w-[62px] shrink-0 text-[14px] leading-5 text-gray-500">COMPL.</label>
                  <div className="min-w-0 flex-1">
                    {addressTextInput('endereco_complemento', 'OPCIONAL')}
                  </div>
                </div>
              </div>

              <SplitRow last>
                <SplitField label="CIDADE" divider>
                  {addressTextInput('endereco_cidade')}
                </SplitField>
                <SplitField label="ESTADO">
                  <input
                    value={formInfo.endereco_estado || ''}
                    onChange={(e) => setFormInfo((prev) => ({ ...prev, endereco_estado: e.target.value.toUpperCase() }))}
                    readOnly={!isEditing('sobre')}
                    className={`${inputClass} truncate uppercase ${inputStateClass(isEditing('sobre'))}`}
                    maxLength={2}
                    placeholder="EX: MG"
                  />
                </SplitField>
              </SplitRow>
            </div>
          </>
        ) : null}
      </div>

      <div className="border-b border-gray-800 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px] leading-5 text-gray-500">GOOGLE</span>
          {googleExpanded ? businessFieldAction('google') : (
            <button type="button" onClick={() => setGoogleExpanded(true)} aria-expanded={googleExpanded} aria-controls="business-google-fields" aria-label="Expandir Google" className={iconButtonClass}>
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
        {googleExpanded ? (
          <div id="business-google-fields" className="mt-3">
            {[
              { key: 'seo_title', label: 'Título para o Google', limit: SEO_TITLE_LIMIT, rows: 2, placeholder: 'Escreva o título para o Google com nome do negócio, especialidade e cidade; até 60 caracteres.' },
              { key: 'seo_description', label: 'Meta description', limit: SEO_DESCRIPTION_LIMIT, rows: 4, placeholder: 'Escreva a meta description para o Google sobre o negócio, trabalhos e cidade; até 160 caracteres.' },
            ].map(({ key, label, limit, rows, placeholder }, index) => (
              <div key={key}>
                {index > 0 ? <div className="-mx-4 my-3 border-t border-gray-800 sm:-mx-6" /> : null}
                <label htmlFor={key} className="sr-only">{label}</label>
                <textarea id={key} value={formInfo[key] || ''} onChange={(e) => setFormInfo((prev) => ({ ...prev, [key]: Array.from(e.target.value).slice(0, limit).join('') }))} readOnly={!isEditing('google')} rows={rows} aria-describedby={key + '-count'} className={inputClass + ' max-h-32 resize-none overflow-y-auto leading-5 ' + inputStateClass(isEditing('google'))} placeholder={placeholder} />
                <div id={key + '-count'} className="text-right text-[12px] text-gray-500">{Array.from(formInfo[key] || '').length}/{limit}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <InfoRow label="INSTAGRAM" action={businessFieldAction('instagram')}>
        <input
          type="text"
          value={visiblePrivateFields.instagram ? (formInfo.instagram || '') : maskedPrivateValue}
          onChange={(e) => setFormInfo((prev) => ({ ...prev, instagram: e.target.value }))}
          readOnly={!isEditing('instagram')}
          className={`${inputClass} uppercase ${inputStateClass(isEditing('instagram'))}`}
          placeholder="@BARBEARIATORRES"
        />
      </InfoRow>

      <InfoRow label="FACEBOOK" action={businessFieldAction('facebook')}>
        <input
          type="text"
          value={visiblePrivateFields.facebook ? (formInfo.facebook || '') : maskedPrivateValue}
          onChange={(e) => setFormInfo((prev) => ({ ...prev, facebook: e.target.value }))}
          readOnly={!isEditing('facebook')}
          className={`${inputClass} uppercase ${inputStateClass(isEditing('facebook'))}`}
          placeholder="BARBEARIA-TORRES"
        />
      </InfoRow>

      <div className="border-b border-gray-800 px-4 py-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <span className="text-[14px] text-gray-400">GALERIA</span>
          <label>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadGaleria(e.target.files)} disabled={galleryUploading} />
            <span className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-[12px] uppercase ${galleryUploading ? 'border-gray-800 text-gray-600' : 'border-primary/30 text-primary'}`}>
              <Plus className="h-3.5 w-3.5" />
              {galleryUploading ? 'ENVIANDO' : 'ADICIONAR IMG'}
            </span>
          </label>
        </div>

        {galeriaItems.length > 0 ? (
          <>
            <div className="columns-2 gap-px lg:columns-3">
              {galeriaItems.map((item) => (
                <div key={item.id || item.path} className="relative mb-px w-full break-inside-avoid overflow-hidden rounded-custom border border-gray-800 bg-dark-200">
                  <img src={getPublicUrl('galerias', item.path)} alt="Galeria" className="h-auto w-full object-contain" loading="lazy" />
                  <button type="button" onClick={() => excluirImagemGaleria(item)} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-700 bg-black/60 px-3 py-1 text-[12px] font-normal uppercase text-red-200 hover:border-red-400 sm:left-auto sm:right-2 sm:top-2 sm:translate-x-0 sm:translate-y-0">
                    EXCLUIR
                  </button>
                </div>
              ))}
            </div>

            {galeriaHasMore ? (
              <div ref={gallerySentinelRef} className="flex h-12 items-center justify-center" aria-hidden="true">
                {galeriaLoadingMore ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-800 border-t-primary" /> : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
        <button type="button" onClick={() => navigate('/criar-negocio')} className="flex-1 rounded-button border border-primary/30 py-3 text-[12px] font-normal uppercase text-primary hover:border-primary">
          CRIAR OUTRO
        </button>
        <button
          type="button"
          onClick={excluirNegocio}
          disabled={deletingBusiness}
          className="flex-1 rounded-button border border-red-500/30 py-3 text-[12px] font-normal uppercase text-red-400 disabled:opacity-50"
        >
          {deletingBusiness ? 'EXCLUINDO' : 'EXCLUIR'}
        </button>
      </div>
    </div>
  );
}
