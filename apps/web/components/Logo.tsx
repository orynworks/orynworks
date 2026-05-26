type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Oryn"
      className={className}
    >
      {/* Left bracket — angular hand opening right */}
      <path
        d="M 24 10 L 12 10 L 8 18 L 8 46 L 12 54 L 24 54 L 19 46 L 19 18 Z"
        fill="currentColor"
      />
      {/* Right bracket — angular hand opening left */}
      <path
        d="M 40 10 L 52 10 L 56 18 L 56 46 L 52 54 L 40 54 L 45 46 L 45 18 Z"
        fill="currentColor"
      />
      {/* Center dot — capability spark */}
      <rect x="27" y="27" width="10" height="10" rx="2.5" fill="#E5734F" />
    </svg>
  );
}
