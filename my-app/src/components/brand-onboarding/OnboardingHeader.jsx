function OnboardingHeader() {
  return (
    <header className="flex justify-between items-center w-full px-container-margin h-16 sticky top-0 z-50 bg-surface-container-lowest shadow-sm border-b border-outline-variant">
      <span className="font-headline-md text-headline-md font-bold text-primary">알리장</span>
      <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors">
        help
      </span>
    </header>
  );
}

export default OnboardingHeader;
