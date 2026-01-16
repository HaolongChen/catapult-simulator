import { Outlet, createRootRoute } from '@tanstack/react-router'
import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-mono">
        <h1 className="text-4xl font-black text-red-500 mb-4">404_NOT_FOUND</h1>
        <p className="text-slate-400">
          The requested coordinate does not exist in our simulation space.
        </p>
        <a
          href="/"
          className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-bold uppercase tracking-widest text-xs"
        >
          Return to Base
        </a>
      </div>
    )
  },
})

function RootComponent() {
  return (
    <>
      <Outlet />
    </>
  )
}
