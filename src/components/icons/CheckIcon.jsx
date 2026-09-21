export default function CheckIcon({
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
        d="M 150 510 L 410 770 L 820 360"
        stroke="currentColor"
        strokeWidth="110"
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
