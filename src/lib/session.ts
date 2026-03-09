const USER_ID_KEY = 'replica_user_id'
const USER_EMAIL_KEY = 'replica_user_email'
const COOKIE_NAME = 'replica_uid'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export function getUserId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_ID_KEY)
}

export function setUserId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_ID_KEY, id)
  document.cookie = `${COOKIE_NAME}=${id}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
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
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
}
