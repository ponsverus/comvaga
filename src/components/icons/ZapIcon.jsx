export default function ZapIcon({
  className = '',
  title,
  size = 24,
  ...props
}) {
  delete props.style;
  return (
    <svg
      viewBox="0 0 1024 1024"
      fill="currentColor"
      width={size}
      height={size}
      className={className}
            xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : 'presentation'}
      aria-hidden={!title}
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M715.12 476.36H453.88L558.12 96.36L206.12 547.64H467.36L363.12 927.64L715.12 476.36Z" />
    </svg>
  );
}
