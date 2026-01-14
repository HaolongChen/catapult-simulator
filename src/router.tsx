import { createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    defaultNotFoundComponent: () => {
      return (
        <div className="p-4">
          <p>Not Found</p>
        </div>
      )
    },

    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}
