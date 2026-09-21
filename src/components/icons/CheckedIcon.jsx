export default function CheckedIcon({
  className = '',
  title,
  ...props
}) {
  delete props.style;
  const cx = 12;
  const cy = 12;
  const baseRadius = 9;
  const petals = 10;
  const depth = 2.2;

  let path = '';

  for (let i = 0; i <= petals; i += 1) {
    const angle = (i / petals) * Math.PI * 2;
    const nextAngle = ((i + 1) / petals) * Math.PI * 2;

    const r1 = baseRadius;
    const r2 = baseRadius + depth;

    const x1 = cx + Math.cos(angle) * r1;
    const y1 = cy + Math.sin(angle) * r1;

    const cx1 = cx + Math.cos(angle + (nextAngle - angle) / 2) * r2;
    const cy1 = cy + Math.sin(angle + (nextAngle - angle) / 2) * r2;

    const x2 = cx + Math.cos(nextAngle) * r1;
    const y2 = cy + Math.sin(nextAngle) * r1;

    if (i === 0) {
      path += `M ${x1} ${y1}`;
    }

    path += ` Q ${cx1} ${cy1} ${x2} ${y2}`;
  }

  path += ' Z';

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

      <path fill="#0095F6" d={path} />

      <path
        d="M8.2 12.2 10.7 14.6 15.8 9.7"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
