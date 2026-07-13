const contactLinks = [
  {
    label: "Email",
    href: import.meta.env.VITE_CONTACT_EMAIL
      ? `mailto:${import.meta.env.VITE_CONTACT_EMAIL}`
      : "mailto:your-email@example.com",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm0 2v.2l8 5 8-5V8H4Zm16 8V10.5l-7.5 4.7a1 1 0 0 1-1 0L4 10.5V16h16Z" />
      </svg>
    ),
  },
  {
    label: "GitHub",
    href: import.meta.env.VITE_GITHUB_URL || "https://github.com/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5A3.9 3.9 0 0 1 6.6 7.8c-.1-.3-.5-1.3.1-2.7 0 0 .8-.3 2.7 1a9.2 9.2 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .6 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1.1 2.7c0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.8V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
      </svg>
    ),
  },
  {
    label: "Discord",
    href: import.meta.env.VITE_DISCORD_URL || "https://discord.com/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.6 5.3A16.5 16.5 0 0 0 15.5 4l-.2.4-.3.7a15.2 15.2 0 0 0-6 0l-.5-1A16.5 16.5 0 0 0 4.4 5.3C1.8 9.1 1.1 12.9 1.5 16.6A16.7 16.7 0 0 0 6.6 19l1.1-1.8c-.6-.2-1.1-.5-1.6-.8l.4-.3a11.8 11.8 0 0 0 11 0l.4.3c-.5.3-1 .6-1.6.8l1.1 1.8a16.7 16.7 0 0 0 5.1-2.4c.5-4.3-.7-8-2.9-11.3ZM8.4 14.3c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7.2 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
      </svg>
    ),
  },
];

function Footer() {
  return (
    <footer className="site-footer">
      <style>{styles}</style>
      <div className="site-footer-inner">
        <span className="footer-brand">Career Mission</span>
        <nav className="footer-socials" aria-label="Contact links">
          {contactLinks.map((link) => (
            <a
              key={link.label}
              className="footer-social-link"
              href={link.href}
              target={link.href.startsWith("mailto:") ? undefined : "_blank"}
              rel={link.href.startsWith("mailto:") ? undefined : "noreferrer"}
              aria-label={link.label}
              title={link.label}
            >
              {link.icon}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

const styles = `
.site-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  width: 100%;
  background: #0f172a;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  box-shadow: 0 -14px 32px rgba(15, 23, 42, 0.16);
}

.site-footer-inner {
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 18px clamp(16px, 4vw, 28px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-sizing: border-box;
}

.footer-brand {
  color: #f8fafc;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0;
}

.footer-socials {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.footer-social-link {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #bfdbfe;
  text-decoration: none;
  transition:
    background 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.footer-social-link:hover {
  color: #ffffff;
  background: rgba(37, 99, 235, 0.34);
  border-color: rgba(96, 165, 250, 0.55);
  transform: translateY(-1px);
}

.footer-social-link:active {
  transform: scale(0.96);
}

.footer-social-link svg {
  width: 23px;
  height: 23px;
  display: block;
  fill: currentColor;
}

@media (max-width: 560px) {
  .site-footer-inner {
    align-items: center;
    flex-direction: row;
    flex-wrap: wrap;
  }
}
`;

export default Footer;
