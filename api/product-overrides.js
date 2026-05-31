import {
  closeLiveReadStore,
  readLiveProductOverrides,
} from '../server/liveReadStore.mjs'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    const overrides = await readLiveProductOverrides()
    res.status(200).json({ overrides })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Could not load product mappings.',
    })
  } finally {
    if (process.env.VERCEL) {
      await closeLiveReadStore()
    }
  }
}
