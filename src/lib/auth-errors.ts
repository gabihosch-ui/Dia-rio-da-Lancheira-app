/** Traduz erros de autenticação do Supabase para mensagens claras em português. */
export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null): string {
  if (!error) return 'Algo deu errado. Tente novamente.';
  switch (error.code) {
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.';
    case 'email_not_confirmed':
      return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.';
    case 'weak_password':
      return 'Senha fraca. Use pelo menos 8 caracteres, com letras e números.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Confira o e-mail digitado.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
    case 'signup_disabled':
      return 'Novos cadastros estão temporariamente desativados.';
    case 'same_password':
      return 'A nova senha precisa ser diferente da anterior.';
  }
  if (error.status === 0 || /fetch|network/i.test(error.message ?? '')) {
    return 'Sem conexão. Verifique sua internet e tente novamente.';
  }
  return 'Algo deu errado. Tente novamente.';
}

export const PASSWORD_MIN = 8;

export function validatePassword(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`;
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Use letras e números na senha.';
  return null;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
