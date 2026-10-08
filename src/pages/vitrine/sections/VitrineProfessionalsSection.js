import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getHorarioPorDia, getSemanaResumo, normalizeProfissionalHorarios } from "../../dashboard/utils.js";
const PROFISSIONAIS_POR_PAGINA = 3;
function StarChar({ size = 16, className = "text-primary" }) {
	const sizeClass = size === 15 ? "text-[15px]" : size === 18 ? "text-lg" : "text-base";
	return /* @__PURE__ */ React.createElement("span", {
		className: `${className} ${sizeClass} leading-none`,
		"aria-hidden": "true"
	}, "★");
}
export default function VitrineProfessionalsDashboardSection({ cards, counterSingular, counterPlural }) {
	const [pagina, setPagina] = useState(0);
	const totalPaginas = Math.ceil(cards.length / PROFISSIONAIS_POR_PAGINA);
	const inicio = pagina * PROFISSIONAIS_POR_PAGINA;
	const itens = cards.slice(inicio, inicio + PROFISSIONAIS_POR_PAGINA);
	const touchStartRef = useRef(null);
	useEffect(() => {
		const ultimaPaginaValida = Math.max(0, totalPaginas - 1);
		setPagina((prev) => Math.min(prev, ultimaPaginaValida));
	}, [totalPaginas]);
	const goPrev = () => setPagina((p) => Math.max(0, p - 1));
	const goNext = () => setPagina((p) => Math.min(totalPaginas - 1, p + 1));
	const handleTouchStart = (event) => {
		const touch = event.touches?.[0];
		if (!touch) return;
		touchStartRef.current = {
			x: touch.clientX,
			y: touch.clientY
		};
	};
	const handleTouchEnd = (event) => {
		const start = touchStartRef.current;
		const touch = event.changedTouches?.[0];
		touchStartRef.current = null;
		if (!start || !touch || totalPaginas <= 1) return;
		const dx = touch.clientX - start.x;
		const dy = touch.clientY - start.y;
		if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
		if (dx < 0) goNext();
		else goPrev();
	};
	return /* @__PURE__ */ React.createElement("section", { className: "py-12 px-4 sm:px-6 lg:px-8 bg-vcard2" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto" }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl sm:text-3xl font-normal mb-6" }, "Profissionais"), /* @__PURE__ */ React.createElement("div", {
		className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start",
		onTouchStart: handleTouchStart,
		onTouchEnd: handleTouchEnd
	}, itens.map((prof) => {
		const horarios = normalizeProfissionalHorarios(prof);
		const horarioHoje = getHorarioPorDia(horarios, prof.todayDow);
		const pausaInicio = horarioHoje?.pausa_inicio ? String(horarioHoje.pausa_inicio).slice(0, 5) : null;
		const pausaFim = horarioHoje?.pausa_fim ? String(horarioHoje.pausa_fim).slice(0, 5) : null;
		const pausaTexto = pausaInicio && pausaFim ? `PAUSA ${pausaInicio} - ${pausaFim}` : "SEM PAUSA";
		const statusLabelRaw = prof.status?.label || "-";
		const statusLabelView = statusLabelRaw;
		return /* @__PURE__ */ React.createElement("div", {
			key: prof.id,
			className: "relative bg-vcard border border-vborder rounded-custom p-5 transition-all hover:border-vprimary/50 self-start"
		}, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3 mb-3" }, prof.avatarUrl ? /* @__PURE__ */ React.createElement("div", { className: "w-12 h-12 rounded-custom overflow-hidden border border-vborder bg-vcard2 shrink-0" }, /* @__PURE__ */ React.createElement("img", {
			src: prof.avatarUrl,
			alt: prof.nome,
			className: "w-full h-full object-cover"
		})) : /* @__PURE__ */ React.createElement("div", { className: "w-12 h-12 bg-vprimary rounded-custom flex items-center justify-center text-xl font-normal text-vprimary-text shrink-0" }, prof.nome?.[0] || "P"), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-3" }, /* @__PURE__ */ React.createElement("h3", { className: "min-w-0 font-normal uppercase text-vtext" }, prof.nome), prof.depInfo?.media && /* @__PURE__ */ React.createElement("div", { className: "inline-flex shrink-0 items-center gap-1 text-vprimary" }, /* @__PURE__ */ React.createElement(StarChar, {
			size: 15,
			className: "text-yellow-400"
		}), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-normal leading-none" }, prof.depInfo.media))), prof.status?.label && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mt-1" }, /* @__PURE__ */ React.createElement("span", { className: `w-2.5 h-2.5 rounded-full shrink-0 ${prof.status.color || "bg-gray-500"}` }), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-vsub font-normal uppercase" }, statusLabelView)), prof.profissaoLabel && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-vmuted mt-1" }, prof.profissaoLabel), prof.anos_experiencia != null && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-vmuted mt-1" }, prof.anos_experiencia, " ANOS DE EXPERIÊNCIA"))), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-vsub mb-3" }, prof.totalEntregas, " ", prof.totalEntregas === 1 ? counterSingular : counterPlural), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-vmuted mb-3" }, /* @__PURE__ */ React.createElement(Clock, { className: "w-4 h-4 inline mr-1" }), pausaTexto), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-vmuted mb-1" }, getSemanaResumo(horarios, prof.todayDow).map((dia, idx, arr) => {
			const item = dia.item;
			const ativo = dia.ativo;
			const isHoje = dia.destaque;
			const cl = isHoje ? "text-vprimary" : ativo ? "text-vsub" : "text-vmuted/60";
			const texto = item ? `${dia.label}${isHoje && ativo ? ` • ${String(item.horario_inicio || "08:00").slice(0, 5)} - ${String(item.horario_fim || "18:00").slice(0, 5)}` : ""}` : dia.label;
			return /* @__PURE__ */ React.createElement(React.Fragment, { key: dia.value }, /* @__PURE__ */ React.createElement("span", { className: cl }, texto), idx < arr.length - 1 && /* @__PURE__ */ React.createElement("span", { className: "mx-1 text-vmuted/60" }, "•"));
		})));
	})), totalPaginas > 1 && /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center gap-4 mt-6" }, /* @__PURE__ */ React.createElement("button", {
		type: "button",
		onClick: goPrev,
		disabled: pagina === 0,
		className: "inline-flex h-7 w-7 items-center justify-center rounded-full bg-transparent border border-vborder text-vmuted transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:border-vsub hover:text-vtext"
	}, /* @__PURE__ */ React.createElement(ChevronLeft, { className: "w-4 h-4" })), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center gap-3" }, Array.from({ length: totalPaginas }).map((_, i) => /* @__PURE__ */ React.createElement("button", {
		type: "button",
		key: i,
		onClick: () => setPagina(i),
		className: ["rounded-full transition-all duration-300", i === pagina ? "w-4 h-2 bg-vprimary" : "w-2 h-2 bg-vborder hover:bg-vsub/40"].join(" "),
		"aria-label": `Página ${i + 1}`
	}))), /* @__PURE__ */ React.createElement("button", {
		type: "button",
		onClick: goNext,
		disabled: pagina === totalPaginas - 1,
		className: "inline-flex h-7 w-7 items-center justify-center rounded-full bg-transparent border border-vborder text-vmuted transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:border-vsub hover:text-vtext"
	}, /* @__PURE__ */ React.createElement(ChevronRight, { className: "w-4 h-4" })))));
}
