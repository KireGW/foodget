import {
  closeLiveReadStore,
  readLiveReceiptReviews,
} from '../server/liveReadStore.mjs'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    const reviews = await readLiveReceiptReviews()
    res.status(200).json({ reviews })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Could not load receipt reviews.',
    })
  } finally {
    if (process.env.VERCEL) {
      await closeLiveReadStore()
    }
  }
}
