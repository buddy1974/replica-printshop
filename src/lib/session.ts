const USER_ID_KEY = 'replica_user_id'
const USER_EMAIL_KEY = 'replica_user_email'

export function getUserId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_ID_KEY)
}

export function setUserId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_ID_KEY, id)
}

export function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_EMAIL_KEY)
}

export function setUserEmail(email: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_EMAIL_KEY, email)
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(USER_EMAIL_KEY)
}
