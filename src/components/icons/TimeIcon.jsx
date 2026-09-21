export default function TimeIcon({ className = '', title,
  ...props }) {
  delete props.style;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
            {...props}
    >
      {title && <title>{title}</title>}

      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
