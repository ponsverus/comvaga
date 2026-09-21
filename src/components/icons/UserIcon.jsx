export default function UserIcon({
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
        cx="512" 
        cy="256" 
        r="185" 
        fill="currentColor"
        opacity="0.9"
      />
      <ellipse 
        cx="512" 
        cy="712" 
        rx="292" 
        ry="170" 
        fill="currentColor"
        opacity="0.45"
      />
    </svg>
  );
}
