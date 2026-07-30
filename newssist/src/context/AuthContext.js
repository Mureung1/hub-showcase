import { createContext, useEffect, useReducer } from 'react';
import { supabase } from '../utils/supabaseClient';
import { translateAuthError } from '../utils/authErrorMessages';

export const AuthContext = createContext(null);

const initialState = {
  status: 'loading', // 'loading' | 'authenticated' | 'unauthenticated'
  session: null,
  user: null,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SESSION_LOADED': {
      const session = action.payload;
      return {
        ...state,
        status: session ? 'authenticated' : 'unauthenticated',
        session,
        user: session?.user ?? null,
        error: null,
      };
    }
    case 'AUTH_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch({ type: 'SESSION_LOADED', payload: session });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        dispatch({ type: 'SESSION_LOADED', payload: session });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email, password) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      dispatch({ type: 'AUTH_ERROR', payload: translateAuthError(error.message) });
      throw error;
    }
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      dispatch({ type: 'AUTH_ERROR', payload: translateAuthError(error.message) });
      throw error;
    }
    // 성공 시엔 dispatch 안 함 — onAuthStateChange 리스너가 처리함(중복 방지)
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const value = { ...state, signUp, signIn, signOut, clearError: () => dispatch({ type: 'CLEAR_ERROR' }) };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
