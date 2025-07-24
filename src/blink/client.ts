import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: 'hotel-rate-comparison-dashboard-shelton-ct-7xu02p6c',
  authRequired: false // No auth needed for web scraping
})