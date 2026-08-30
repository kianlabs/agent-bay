import PusherJS from 'pusher-js'

let pusherInstance: PusherJS | null = null

export function getPusherClient(): PusherJS {
  if (!pusherInstance) {
    pusherInstance = new PusherJS(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      }
    )
    
    // Debug connection
    pusherInstance.connection.bind('error', (err: any) => {
      console.error('❌ Pusher connection error:', err)
    })
    
    pusherInstance.connection.bind('connected', () => {
      console.log('✅ Pusher connected successfully')
    })
  }
  return pusherInstance
}
