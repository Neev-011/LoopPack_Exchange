export const PASSWORD_POLICY_MESSAGE = 'Password must be at least 8 characters and include at least 1 alphabet, 1 number, and 1 symbol.';

export function getPasswordRequirements(password = '') {
  return {
    minLength: password.length >= 8,
    alphabet: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z\d\s]/.test(password)
  };
}

export function isValidPassword(password = '') {
  const requirements = getPasswordRequirements(password);
  return Object.values(requirements).every(Boolean);
}