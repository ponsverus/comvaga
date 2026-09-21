export default function SearchIcon({
  className = '',
  title,
  size = 24,
  ...props
}) {
  delete props.style;
  return (
    <svg
      viewBox="0 0 1024 1024"
      fill="none"
      width={size}
      height={size}
      className={className}
            xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : 'presentation'}
      aria-hidden={!title}
      {...props}
    >
      {title && <title>{title}</title>}
      <circle
        cx="460"
        cy="460"
        r="330"
        stroke="currentColor"
        strokeWidth="110"
      />
      <path
        d="M695 695 L900 900"
        stroke="currentColor"
        strokeWidth="110"
        strokeLinecap="round"
      />
    </svg>
  );
}
