import Pusher from 'pusher'

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})

// Trigger helper
export async function triggerPusherEvent(
  event: string,
  data: any
) {
  try {
    await pusherServer.trigger('agent-ops', event, data)
    console.log(`✅ Pusher event triggered: ${event}`)
  } catch (error) {
    console.error('❌ Pusher trigger failed:', error)
  }
}
