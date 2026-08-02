import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/health')({
  server: {
    handlers: {
      GET: async () => {
        return new Response(
          JSON.stringify({
            status: 'ok',
            uptime: typeof process !== 'undefined' ? process.uptime() : null,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store',
            },
          },
        )
      },
    },
  },
})
