import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface LandingCtaProps {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export default function LandingCta({
  children,
  className = '',
  variant = 'primary',
}: LandingCtaProps) {
  const { isAuthenticated, loading } = useAuth();
  const to = !loading && isAuthenticated ? '/user' : '/login';
  const baseClass =
    variant === 'primary'
      ? 'btn btn-primary landing-cta'
      : variant === 'secondary'
        ? 'btn btn-secondary landing-cta'
        : 'landing-cta landing-cta-ghost';

  return (
    <Link to={to} className={`${baseClass} ${className}`.trim()}>
      {children}
    </Link>
  );
}
