export default function MessageIcon({
  className = '',
  title,
  style = {},
  size = 24,
  ...props
}) {
  return (
    <svg
      viewBox="0 0 23 23"
      fill="currentColor"
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

      <g transform="translate(23 0) scale(-1 1)">
        <path
          fillRule="evenodd"
          d="M23 23l-5.89-1.473a11.5 11.5 0 1 1 4.42-4.419ZM18.21 4.755a9.516 9.516 0 1 0-1 14.314L20 20l-.93-2.792a9.507 9.507 0 0 0-.86-12.453ZM16.5 13a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 16.5 13Zm-5 0A1.5 1.5 0 1 1 13 11.5a1.5 1.5 0 0 1-1.5 1.5Zm-5 0A1.5 1.5 0 1 1 8 11.5 1.5 1.5 0 0 1 6.5 13Z"
        />
      </g>
    </svg>
  );
}
