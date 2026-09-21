export default function UsersIcon({ className = '', title,
  ...props }) {
  delete props.style;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
            aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : 'presentation'}
      {...props}
    >
      {title && <title>{title}</title>}

      <circle cx="17" cy="8" r="3.2" opacity="0.4" />
      <ellipse cx="17" cy="17.5" rx="5" ry="3" opacity="0.4" />

      <circle cx="10" cy="9" r="4" opacity="1" />
      <ellipse cx="10" cy="19" rx="6.5" ry="3.2" opacity="1" />
    </svg>
  );
}
