export default function AlertCircleIcon({
  className = '',
  title,
  style = {},
  size = 24,
  ...props
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : 'presentation'}
      aria-hidden={!title}
      {...props}
    >
      {title && <title>{title}</title>}

      <circle
        cx="12"
        cy="12"
        r="10.75"
        stroke="currentColor"
        strokeWidth="2"
      />

      <path
        d="M12 4.7
           C10.95 4.7 10.25 5.5 10.35 6.55
           L11.05 12.85
           C11.12 13.55 11.48 13.95 12 13.95
           C12.52 13.95 12.88 13.55 12.95 12.85
           L13.65 6.55
           C13.75 5.5 13.05 4.7 12 4.7
           Z"
        fill="currentColor"
      />

      <circle
        cx="12"
        cy="17.25"
        r="1.2"
        fill="currentColor"
      />
    </svg>
  );
}
