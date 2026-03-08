// Email notification placeholders — integrate a provider (Resend, SendGrid, etc.) later.
// All functions log to console only.

export async function sendOrderConfirmed(orderId: string, userEmail: string) {
  console.log(`[email] ORDER_CONFIRMED orderId=${orderId} to=${userEmail}`)
}

export async function sendUploadNeeded(orderId: string, userEmail: string) {
  console.log(`[email] UPLOAD_NEEDED orderId=${orderId} to=${userEmail}`)
}

export async function sendApproved(orderId: string, userEmail: string) {
  console.log(`[email] APPROVED orderId=${orderId} to=${userEmail}`)
}

export async function sendProductionStarted(orderId: string, userEmail: string) {
  console.log(`[email] PRODUCTION_STARTED orderId=${orderId} to=${userEmail}`)
}

export async function sendDone(orderId: string, userEmail: string) {
  console.log(`[email] DONE orderId=${orderId} to=${userEmail}`)
}
