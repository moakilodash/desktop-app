import { ArrowLeft, Home } from 'lucide-react'
import React from 'react'
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom'

import { Button } from '../../components/ui/Button'

export const ErrorBoundary: React.FC = () => {
  const error = useRouteError()

  // Check if it's a route error (like 404)
  if (isRouteErrorResponse(error)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold mb-4">
            {error.status === 404 ? 'Page Not Found' : `Error ${error.status}`}
          </h1>
          <p className="text-lg mb-6">
            {error.status === 404
              ? "Sorry, we couldn't find the page you're looking for."
              : error.statusText || 'An unexpected error occurred'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              className="flex items-center gap-2"
              onClick={() => window.history.back()}
              variant="outline"
            >
              <ArrowLeft size={16} />
              Go Back
            </Button>
            <Button className="flex items-center gap-2">
              <Link to="/">
                <Home size={16} />
                Go Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // For other errors
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="max-w-md">
        <h1 className="text-4xl font-bold mb-4">Oops! Something went wrong</h1>
        <p className="text-lg mb-6">
          We're sorry, but an unexpected error has occurred.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            className="flex items-center gap-2"
            onClick={() => window.history.back()}
            variant="outline"
          >
            <ArrowLeft size={16} />
            Go Back
          </Button>
          <Button className="flex items-center gap-2">
            <Link to="/">
              <Home size={16} />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
