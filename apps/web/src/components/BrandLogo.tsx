type BrandLogoProps = {
  variant?: "nav" | "modal";
};

const markUrl = `${import.meta.env.BASE_URL}assets/PtoP_LogoImage.png`;
const wordmarkUrl = `${import.meta.env.BASE_URL}assets/PtoP_LogoText.png`;

export function BrandLogo({ variant = "nav" }: BrandLogoProps) {
  return (
    <span className={`brand-lockup brand-lockup--${variant}`} aria-label="PtoP">
      <img className="brand-lockup__mark" src={markUrl} alt="" />
      <img className="brand-lockup__wordmark" src={wordmarkUrl} alt="PtoP" />
    </span>
  );
}
