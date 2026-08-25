export default function CheckDoubleIcon({
  className = '',
  title,
  style = {},
  size = 24,
  ...props
}) {
  return (
    <svg
      viewBox="0 0 1024 1024"
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

      <path
        d="M 50 510 L 310 770 L 720 360"
        stroke="currentColor"
        strokeWidth="110"
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
      <path
        d="M 250 510 L 510 770 L 920 360"
        stroke="currentColor"
        strokeWidth="110"
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
