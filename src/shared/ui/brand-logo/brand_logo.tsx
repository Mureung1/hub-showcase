export type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      viewBox="0 0 320 320"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M43.0669 107.6C40.8053 91.5079 51.444 77.3899 67.5358 75.1283L143.044 64.5164C159.136 62.2548 173.254 72.8935 175.515 88.9854L199.523 259.807L128.872 233.13L67.0742 278.421L43.0669 107.6Z"
        fill="var(--color-electric-blue)"
      />
      <path
        d="M142.066 47.4525C144.327 31.3606 158.445 20.722 174.537 22.9835L241.38 32.3777C257.472 34.6393 268.111 48.7573 265.849 64.8491L241.494 238.146L184.299 196.026L117.71 220.749L142.066 47.4525Z"
        fill="var(--color-amber)"
      />
    </svg>
  );
}
