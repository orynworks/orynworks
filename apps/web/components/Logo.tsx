import Image from "next/image";

type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <Image
      src="/logo2.png"
      alt="Oryn"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
