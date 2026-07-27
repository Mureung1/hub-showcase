import { CircleHelp } from "lucide-react";
import { createPortal } from "react-dom";
import { useId, useLayoutEffect, useRef, useState } from "react";

type TermHelpProps = {
  term: string;
  description: string;
};

/** Keeps specialist labels visible while giving readers an optional plain-language explanation. */
export function TermHelp({ term, description }: TermHelpProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) return;

    const updatePosition = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const tooltip = tooltipRef.current?.getBoundingClientRect();
      if (!trigger || !tooltip) return;

      const gutter = 12;
      const preferredTop = trigger.top - tooltip.height - 8;
      const top =
        preferredTop >= gutter
          ? preferredTop
          : Math.min(trigger.bottom + 8, window.innerHeight - tooltip.height - gutter);
      const left = Math.min(
        Math.max(trigger.left + trigger.width / 2 - tooltip.width / 2, gutter),
        window.innerWidth - tooltip.width - gutter,
      );
      setPosition({ left, top: Math.max(gutter, top) });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    setPosition(null);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
      className="term-help"
        aria-label={`${term}: ${description}`}
        aria-describedby={isOpen ? tooltipId : undefined}
        onBlur={close}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
        onPointerEnter={() => setIsOpen(true)}
        onPointerLeave={close}
      >
        <CircleHelp size={13} aria-hidden="true" />
      </button>
      {isOpen &&
        createPortal(
          <span
            ref={tooltipRef}
            id={tooltipId}
            className="term-help-tooltip"
            role="tooltip"
            style={position ? { left: position.left, top: position.top } : { visibility: "hidden" }}
          >
            {description}
          </span>,
          document.body,
        )}
    </>
  );
}
