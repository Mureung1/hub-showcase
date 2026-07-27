import { useEffect, useRef, useState, type PropsWithChildren } from "react";

type ScrollRevealProps = PropsWithChildren<{
  className?: string;
  delay?: number;
  threshold?: number;
}>;

export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  threshold = 0.16,
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;

    if (!element || isVisible) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        setIsVisible(true);
        observer.disconnect();
      },
      { threshold },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [isVisible, threshold]);

  return (
    <div
      ref={elementRef}
      className={`transition-[opacity,transform] duration-1000 ease-[var(--ease-emphasized)] motion-reduce:transition-none ${isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
