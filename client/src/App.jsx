import { useEffect, useState } from 'react';

import { BookshelfPage } from '@/components/bookshelf/BookshelfPage';
import { OnboardingPage } from '@/components/onboarding/OnboardingPage';
import { getSession } from '@/lib/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    getSession()
      .then((sessionUser) => {
        if (!isCancelled) setUser(sessionUser);
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setIsAuthLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user && window.location.pathname === '/') {
      window.history.replaceState({}, '', '/bookshelf');
    }
  }, [user]);

  function handleOnboardingComplete(newUser) {
    window.history.pushState({}, '', '/bookshelf');
    setUser(newUser);
  }

  if (isAuthLoading) {
    return <main className="bookshelf-preview"><p className="bookshelf-status">잇장을 불러오고 있어요.</p></main>;
  }

  if (!user) {
    return <OnboardingPage onComplete={handleOnboardingComplete} />;
  }

  return <BookshelfPage user={user} />;
}
