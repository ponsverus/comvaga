export default function TimePastIcon({
  className = '',
  title,
  ...props
}) {
  delete props.style;
  return (
    <svg
      viewBox="0 0 512 512"
      fill="currentColor"
      className={className}
            aria-hidden={!title}
      role={title ? 'img' : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}

      <path d="M256,48C141.13,48,48,141.13,48,256H16l48,48l48-48H80c0-97.05,78.95-176,176-176s176,78.95,176,176
      s-78.95,176-176,176c-48.63,0-92.68-19.79-124.53-51.67l-22.63,22.63C145.27,438.6,198.49,464,256,464
      c114.87,0,208-93.13,208-208S370.87,48,256,48z" />

      <path d="M256,144c-8.84,0-16,7.16-16,16v104c0,4.24,1.69,8.31,4.69,11.31l72,72l22.63-22.63L272,251.31V160
      C272,151.16,264.84,144,256,144z" />
    </svg>
  );
}
