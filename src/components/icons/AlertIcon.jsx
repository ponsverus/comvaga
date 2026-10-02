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
        r="10"
        stroke="currentColor"
        strokeWidth="2"
      />

      <path
        d="M 12 5
           C 10.25 5 9 6.25 9 8
           C 9 9.85 10.25 12.15 12 15
           C 13.75 12.15 15 9.85 15 8
           C 15 6.25 13.75 5 12 5
           Z"
        fill="currentColor"
      />

      <circle
        cx="12"
        cy="18"
        r="1.25"
        fill="currentColor"
      />
    </svg>
  );
}
