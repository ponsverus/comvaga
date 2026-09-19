import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';
import { useFeedback } from '../feedback/useFeedback';
import { ProfessionalIcon } from '../components/icons';
import { DEFAULT_PLAN_CODE, clearSelectedPlanIntent, getSelectedPlanIntent, normalizePlanCode } from '../utils/plans';
import { formatPhoneForDisplay, normalizeBrazilPhone } from '../utils/phone';
import { withAuthRetry } from '../utils/authSession';
import { fetchUserAccessProfile } from '../utils/profileAccess';

function onlyTrim(v) {
  return String(v || '').trim();
}

function negocioEnderecoFields(negocio) {
  if (!negocio) {
    return { rua: '', numero: '', bairro: '', cidade: '', estado: '', cep: '', complemento: '' };
  }
  return {
    rua: onlyTrim(negocio.endereco_rua),
    numero: onlyTrim(negocio.endereco_numero),
    bairro: onlyTrim(negocio.endereco_bairro),
    cidade: onlyTrim(negocio.endereco_cidade),
    estado: onlyTrim(negocio.endereco_estado),
    cep: onlyTrim(negocio.endereco_cep),
    complemento: onlyTrim(negocio.endereco_complemento),
  };
}

function ResumeFieldRow({ label, children, last = false }) {
  return (
    <div className={`flex items-start gap-3 px-5 py-3 ${last ? '' : 'border-b border-gray-800/50'}`}>
      <label className="w-[96px] shrink-0 py-2 text-sm tracking-wide text-white">{label}</label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ResumeSplitRow({ children, last = false }) {
  return (
    <div className={`grid grid-cols-2 ${last ? '' : 'border-b border-gray-800/50'}`}>
      {children}
    </div>
  );
}

function ResumeSplitField({ label, children, divider = false }) {
  return (
    <div className={`flex items-center gap-3 px-5 py-3 ${divider ? 'border-r border-gray-800/50' : ''}`}>
      <label className="w-[62px] shrink-0 text-sm tracking-wide text-white">{label}</label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const fieldInputClass = 'w-full bg-transparent px-0 py-2 text-sm text-white placeholder-gray-600 outline-none focus:text-white';

export default function SignupProfessionalResume({ user, onLogin }) {
  const navigate = useNavigate();
  const { showMessage } = useFeedback();

  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [profileName, setProfileName] = useState('');
  const [resumeContexts, setResumeContexts] = useState([]);
  const [selectedNegocioId, setSelectedNegocioId] = useState('');
  const [formData, setFormData] = useState({
    nomeNegocio: '',
    urlNegocio: '',
    tipoNegocio: '',
    telefone: '',
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
  });

  useEffect(() => {
    let active = true;

    async function loadResumeData() {
      if (!user?.id) return;

      try {
        const [
          { data: userData, error: userErr },
          { data: negocioRows, error: negocioErr },
        ] = await Promise.all([
          withAuthRetry(
            () => supabase.from('users').select('nome').eq('id', user.id).maybeSingle(),
            6000,
            'resume-user-profile'
          ),
          withAuthRetry(
            () => supabase.from('negocios')
              .select('id, nome, slug, tipo_negocio, telefone, endereco_cep, endereco_rua, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_estado, created_at')
              .eq('owner_id', user.id)
              .order('created_at', { ascending: true }),
            6000,
            'resume-businesses'
          ),
        ]);

        if (userErr) throw userErr;
        if (negocioErr) throw negocioErr;
        if (!active) return;

        const contexts = (negocioRows || [])
          .map((negocio) => ({ negocio }));

        const initialContext = contexts[0] || null;
        const endereco = negocioEnderecoFields(initialContext?.negocio);

        setProfileName(onlyTrim(userData?.nome || user?.user_metadata?.nome || ''));
        setResumeContexts(contexts);
        setSelectedNegocioId(initialContext?.negocio?.id || '');
        setFormData({
          nomeNegocio: onlyTrim(initialContext?.negocio?.nome),
          urlNegocio: onlyTrim(initialContext?.negocio?.slug),
          tipoNegocio: onlyTrim(initialContext?.negocio?.tipo_negocio),
          telefone: formatPhoneForDisplay(initialContext?.negocio?.telefone),
          cep: endereco.cep,
          rua: endereco.rua,
          numero: endereco.numero,
          complemento: endereco.complemento,
          bairro: endereco.bairro,
          cidade: endereco.cidade,
          estado: endereco.estado,
        });
      } catch (err) {
        console.error('SignupProfessionalResume load error:', err);
        showMessage('signupProfessional.resume_load_error');
      } finally {
        if (active) setBooting(false);
      }
    }

    loadResumeData();
    return () => { active = false; };
  }, [showMessage, user?.id, user?.user_metadata?.nome]);

  useEffect(() => {
    if (!selectedNegocioId) return;
    const selectedContext = resumeContexts.find((item) => item.negocio.id === selectedNegocioId);
    if (!selectedContext) return;
    const endereco = negocioEnderecoFields(selectedContext.negocio);
    setFormData({
      nomeNegocio: onlyTrim(selectedContext.negocio?.nome),
      urlNegocio: onlyTrim(selectedContext.negocio?.slug),
      tipoNegocio: onlyTrim(selectedContext.negocio?.tipo_negocio),
      telefone: formatPhoneForDisplay(selectedContext.negocio?.telefone),
      cep: endereco.cep,
      rua: endereco.rua,
      numero: endereco.numero,
      complemento: endereco.complemento,
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      estado: endereco.estado,
    });
  }, [selectedNegocioId, resumeContexts]);

  const generateSlug = (text) => {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNegocioNameChange = (value) => {
    const nomeUpper = value.toUpperCase();
    setFormData((prev) => ({
      ...prev,
      nomeNegocio: nomeUpper,
      urlNegocio: generateSlug(nomeUpper),
    }));
  };

  const validarEnderecoCompleto = () => {
    if (!onlyTrim(formData.rua)) return 'signupProfessional.address_street_required';
    if (!onlyTrim(formData.numero)) return 'signupProfessional.address_number_required';
    if (!onlyTrim(formData.bairro)) return 'signupProfessional.address_format_invalid';
    if (!onlyTrim(formData.cidade)) return 'signupProfessional.address_city_required';
    if (!onlyTrim(formData.estado)) return 'signupProfessional.address_state_required';
    if (!onlyTrim(formData.cep)) return 'signupProfessional.address_format_invalid';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const nome = onlyTrim(profileName || user?.user_metadata?.nome);
      const negocioId = String(selectedNegocioId || '').trim();
      const nomeNegocio = onlyTrim(formData.nomeNegocio);
      const slug = onlyTrim(formData.urlNegocio);
      const tipoNegocio = onlyTrim(formData.tipoNegocio);
      const telefoneRaw = onlyTrim(formData.telefone);
      const telefone = normalizeBrazilPhone(telefoneRaw);
      const isWaitingRoom = !resumeContexts.length;

      if (!nome) { showMessage('signupProfessional.name_required'); return; }
      if (!telefoneRaw) { showMessage('signupProfessional.phone_required'); return; }
      if (telefone === null) { showMessage('signupProfessional.phone_invalid'); return; }
      if (!nomeNegocio) { showMessage('signupProfessional.business_name_required'); return; }
      if (!slug || slug.length < 3) { showMessage('signupProfessional.business_slug_invalid'); return; }
      if (!tipoNegocio) { showMessage('signupProfessional.business_type_required'); return; }

      const enderecoKey = validarEnderecoCompleto();
      if (enderecoKey) { showMessage(enderecoKey); return; }

      const { data, error } = await withAuthRetry(
        () => supabase.rpc('complete_owner_business_onboarding', {
          p_negocio_id: isWaitingRoom ? null : negocioId,
          p_nome_usuario: nome,
          p_nome_negocio: nomeNegocio,
          p_slug: slug,
          p_telefone: telefone,
          p_tipo_negocio: tipoNegocio,
          p_endereco_cep: formData.cep,
          p_endereco_rua: formData.rua,
          p_endereco_numero: formData.numero,
          p_endereco_complemento: formData.complemento,
          p_endereco_bairro: formData.bairro,
          p_endereco_cidade: formData.cidade,
          p_endereco_estado: formData.estado,
        }),
        8000,
        'complete-owner-onboarding'
      );

      if (error) {
        const code = String(error.message || '').split(':')[0].trim();

        if (code === 'slug_indisponivel') {
          showMessage('signupProfessional.business_slug_taken');
          return;
        }
        if (code === 'partner_cannot_create_business') {
          showMessage('signupProfessional.partner_cannot_create_business');
          return;
        }
        if (code === 'usuario_nao_encontrado' || code === 'negocio_nao_encontrado') {
          showMessage('signupProfessional.profile_not_created');
          return;
        }
        if (code === 'slug_invalido') {
          showMessage('signupProfessional.business_slug_invalid');
          return;
        }
        console.error('complete_owner_business_onboarding error:', error);
        showMessage('signupProfessional.business_create_error');
        return;
      }

      if (!data?.negocio_id) {
        console.error('complete_owner_business_onboarding incomplete payload:', data);
        showMessage('signupProfessional.business_create_error');
        return;
      }

      const selectedPlanCode = normalizePlanCode(user?.user_metadata?.selected_plan)
        || getSelectedPlanIntent()
        || DEFAULT_PLAN_CODE;
      const { error: planError } = await withAuthRetry(
        () => supabase.rpc('set_business_plan', {
          p_negocio_id: data.negocio_id,
          p_plan_code: selectedPlanCode,
        }),
        6500,
        'resume-set-plan'
      );
      if (planError) {
        console.warn('set_business_plan error:', planError);
        showMessage('signupProfessional.plan_selection_failed');
      } else {
        clearSelectedPlanIntent();
      }

      const profile = await fetchUserAccessProfile(user?.id);
      if (!profile) {
        showMessage('signupProfessional.profile_not_created');
        return;
      }

      onLogin(user, profile.type, profile.onboardingStatus, profile.accessState, profile.professionalRole);
      navigate('/dashboard', { state: { negocioId: data.negocio_id } });
    } catch (err) {
      console.error('SignupProfessionalResume error:', err);
      showMessage('signupProfessional.resume_error');
    } finally {
      setLoading(false);
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-primary text-xl">CARREGANDO...</div>
        </div>
      </div>
    );
  }

  const selectClass = 'w-full px-4 py-3 bg-dark-100/40 border border-gray-800/50 rounded-custom text-white placeholder-gray-600 focus:border-primary/50 focus:outline-none focus:bg-dark-100/60 transition-all backdrop-blur-sm text-sm';
  const labelClass = 'block text-sm text-gray-400 mb-2 tracking-wide';
  const isWaitingRoom = !resumeContexts.length;
  const hasMultipleContexts = resumeContexts.length > 1;

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-primary mb-12 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-normal tracking-wider">VOLTAR</span>
        </Link>

        <div className="flex justify-center mb-8">
          <img src="/Comvaga Logo.png" alt="COMVAGA" className="h-24 w-auto object-contain" />
        </div>

        <div className="text-center mb-10">
          <ProfessionalIcon className="mx-auto mb-4 text-primary w-12 h-12" />
          <h1 className="text-4xl font-normal mb-3 tracking-wide">{isWaitingRoom ? 'CRIAR VITRINE' : 'RETOMAR VITRINE'}</h1>
          <p className="text-gray-500 text-base font-normal">
            {isWaitingRoom ? 'FINALIZE OS DADOS DO SEU NEGÓCIO PARA LIBERAR O DASHBOARD.' : 'SEU CADASTRO FICOU INCOMPLETO. FINALIZE OS DADOS PARA LIBERAR O DASHBOARD.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {hasMultipleContexts && (
            <div>
              <label className={labelClass}>QUAL NEGÓCIO DESEJA RETOMAR?</label>
              <select
                value={selectedNegocioId}
                onChange={(e) => setSelectedNegocioId(e.target.value)}
                className={selectClass}
                required
              >
                {resumeContexts.map((context) => (
                  <option key={context.negocio.id} value={context.negocio.id}>
                    {context.negocio.nome || context.negocio.slug || context.negocio.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="overflow-hidden rounded-custom border border-gray-800/50 bg-dark-100/40 backdrop-blur-sm">
            <ResumeFieldRow label="SEU NOME">
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className={`${fieldInputClass} uppercase`}
                placeholder="NOME COMPLETO"
                required
              />
            </ResumeFieldRow>

            <ResumeFieldRow label="NOME">
              <input
                type="text"
                value={formData.nomeNegocio}
                onChange={(e) => handleNegocioNameChange(e.target.value)}
                className={`${fieldInputClass} uppercase`}
                required
                placeholder="NOME DO NEGÓCIO"
              />
            </ResumeFieldRow>

            <ResumeFieldRow label="TELEFONE">
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData((prev) => ({ ...prev, telefone: e.target.value }))}
                placeholder="WHATSAPP"
                className={fieldInputClass}
                required
              />
            </ResumeFieldRow>

            <ResumeFieldRow label="TIPO">
              <input
                type="text"
                value={formData.tipoNegocio}
                onChange={(e) => setFormData((prev) => ({ ...prev, tipoNegocio: e.target.value.toUpperCase() }))}
                className={`${fieldInputClass} uppercase`}
                required
                placeholder="EX: BARBEARIA, CLÍNICA..."
              />
            </ResumeFieldRow>

            <ResumeFieldRow label="SUA URL">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-sm text-gray-600">COMVAGA.COM.BR/V/</span>
                <input
                  type="text"
                  value={formData.urlNegocio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, urlNegocio: generateSlug(e.target.value) }))}
                  className={`${fieldInputClass} uppercase`}
                  required
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                />
              </div>
            </ResumeFieldRow>

            <ResumeSplitRow>
              <ResumeSplitField label="CEP" divider>
                <input
                  type="text"
                  value={formData.cep}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cep: e.target.value }))}
                  className={fieldInputClass}
                  required
                />
              </ResumeSplitField>

              <ResumeSplitField label="BAIRRO">
                <input
                  type="text"
                  value={formData.bairro}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bairro: e.target.value }))}
                  className={fieldInputClass}
                  required
                />
              </ResumeSplitField>
            </ResumeSplitRow>

            <ResumeSplitRow>
              <ResumeSplitField label="RUA" divider>
                <input
                  type="text"
                  value={formData.rua}
                  onChange={(e) => setFormData((prev) => ({ ...prev, rua: e.target.value }))}
                  className={fieldInputClass}
                  required
                />
              </ResumeSplitField>

              <ResumeSplitField label="NÚM.">
                <input
                  type="text"
                  value={formData.numero}
                  onChange={(e) => setFormData((prev) => ({ ...prev, numero: e.target.value }))}
                  className={fieldInputClass}
                  required
                />
              </ResumeSplitField>
            </ResumeSplitRow>

            <ResumeFieldRow label="COMPL.">
              <input
                type="text"
                value={formData.complemento}
                onChange={(e) => setFormData((prev) => ({ ...prev, complemento: e.target.value }))}
                className={fieldInputClass}
                placeholder="OPCIONAL"
              />
            </ResumeFieldRow>

            <ResumeSplitRow last>
              <ResumeSplitField label="CIDADE" divider>
                <input
                  type="text"
                  value={formData.cidade}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cidade: e.target.value }))}
                  className={fieldInputClass}
                  required
                />
              </ResumeSplitField>

              <ResumeSplitField label="ESTADO">
                <input
                  type="text"
                  value={formData.estado}
                  onChange={(e) => setFormData((prev) => ({ ...prev, estado: e.target.value }))}
                  placeholder="EX: MG"
                  className={fieldInputClass}
                  required
                />
              </ResumeSplitField>
            </ResumeSplitRow>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary/10 border border-primary/30 hover:border-primary/60 hover:bg-primary/20 text-primary rounded-full font-normal text-sm tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'FINALIZANDO...' : isWaitingRoom ? 'CRIAR VITRINE' : 'FINALIZAR CADASTRO'}
          </button>
        </form>
      </div>
    </div>
  );
}
