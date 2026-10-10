function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const { code } = error;
  return typeof code === 'string' ? code.replace(/^auth\//, '') : undefined;
}

export function getSignInErrorMessage(error: unknown): string {
  switch (getErrorCode(error)) {
    case 'user-disabled':
      return 'This account has been disabled. Please contact your administrator.';
    case 'invalid-email':
      return 'Enter a valid email address.';
    case 'invalid-credential':
    case 'user-not-found':
    case 'wrong-password':
      return 'The email or password is incorrect. Please check your details and try again.';
    case 'too-many-requests':
      return 'Too many unsuccessful attempts. Please wait a while and try again.';
    case 'network-request-failed':
      return 'Could not connect to the sign-in service. Check your internet connection and try again.';
    case 'operation-not-allowed':
      return 'Email and password sign-in is not enabled. Please contact your administrator.';
    default:
      return 'Sign-in failed. Please verify your details or contact your administrator.';
  }
}
