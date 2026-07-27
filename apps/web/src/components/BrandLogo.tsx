type BrandLogoProps = {
  variant?: "nav" | "modal";
};

const markUrl = `${import.meta.env.BASE_URL}assets/PtoP_LogoImage.png`;
const wordmarkUrl = `${import.meta.env.BASE_URL}assets/PtoP_LogoText.png`;

export function BrandLogo({ variant = "nav" }: BrandLogoProps) {
  return (
    <span
      className={`inline-flex items-center ${variant === "modal" ? "mx-auto justify-center" : ""}`}
      aria-label="PtoP"
    >
      <img
        className={variant === "modal" ? "block h-16" : "block h-11 w-auto"}
        src={markUrl}
        alt=""
      />
      <img
        className={
          variant === "modal" ? "block h-16 w-auto" : "block h-11 w-auto"
        }
        src={wordmarkUrl}
        alt="PtoP"
      />
    </span>
  );
}
