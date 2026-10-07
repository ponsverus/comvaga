import React from 'react';
export default function LocationIcon({ className = "", title, size = 24, ...props }) {
	delete props.style;
	return /* @__PURE__ */ React.createElement("svg", {
		viewBox: "0 0 1024 1024",
		fill: "currentColor",
		width: size,
		height: size,
		className,
		xmlns: "http://www.w3.org/2000/svg",
		role: title ? "img" : "presentation",
		"aria-hidden": !title,
		...props
	}, title && /* @__PURE__ */ React.createElement("title", null, title), /* @__PURE__ */ React.createElement("path", { d: "M 816 208 L 109 497 L 466 544 L 513 901 Z" }));
}
