export default function ShieldIcon({ className = '', title,
  ...props }) {
  delete props.style;
  const shieldPath =
    'M12 2.5C9.5 2.5 6.5 3.5 5 4.5V12.5C5 16.5 8 20 12 21.5C16 20 19 16.5 19 12.5V4.5C17.5 3.5 14.5 2.5 12 2.5Z';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
            aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : 'presentation'}
      {...props}
    >
      {title && <title>{title}</title>}

      <path
        d={shieldPath}
        fill="currentColor"
        opacity="0.35"
      />

      <path
        d={shieldPath}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
