const ORDER_LABELS: Record<string, string> = {
  PENDING: 'Waiting for payment',
  CONFIRMED: 'Paid',
  UPLOADED: 'Files uploaded',
  APPROVED: 'Approved',
  READY: 'Ready for production',
  IN_PRODUCTION: 'In production',
  DONE: 'Finished',
  CANCELLED: 'Cancelled',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
}

export function orderStatusLabel(status: string): string {
  return ORDER_LABELS[status] ?? status
}
