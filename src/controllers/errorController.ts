import { useNavigate, NavigateFunction } from 'react-router-dom';

/**
 * Error controller to handle error-related actions
 */
export const useErrorController = () => {
  // Using try-catch to handle cases where this hook is used outside Router context
  let navigate: NavigateFunction | undefined;
  try {
    navigate = useNavigate();
  } catch (error) {
    console.warn('useNavigate() hook used outside Router context');
  }

  /**
   * Navigate the user back to the home page
   */
  const goToHome = (): void => {
    if (navigate) {
      navigate('/');
    } else {
      window.location.href = '/';
    }
  };

  /**
   * Navigate the user back to the previous page
   */
  const goBack = (): void => {
    if (navigate) {
      navigate(-1);
    } else {
      window.history.back();
    }
  };

  return {
    goToHome,
    goBack,
  };
};