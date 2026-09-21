export default function LogoutIcon({
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
      
      <path
        d="M600 150 H300 C150 150 150 150 150 300 V724 C150 874 150 874 300 874 H600 M450 512 H900"
        stroke="#1e2c4c"
        strokeWidth="90"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M780 320 L972 512 L780 704"
        stroke="#1e2c4c"
        strokeWidth="90"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
