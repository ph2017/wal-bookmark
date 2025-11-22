'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supbase/client'
import { Button } from '@/components/ui/button'
import { GoogleIcon } from '@/components/icons/google'
import { toast } from 'react-hot-toast'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (error) {
        console.error('Login error:', error)
        toast.error('Login failed, please try again')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Login failed, please try again')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50 dark:from-slate-900 dark:to-purple-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900 mb-6">
            <GoogleIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div> */}
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
            Quick login with your Google account
          </p>
        </div>
        <div className="mt-8 space-y-6 flex justify-center">
          <div>
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="group min-w-[250px] relative flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <GoogleIcon className="h-5 w-5" />
              </span>
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </Button>
          </div>
        </div>
        {/* <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            By signing in, you agree to our{' '}
            <a href="/terms-of-service" className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy-policy" className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300">
              Privacy Policy
            </a>
          </p>
        </div> */}
      </div>
    </div>
  )
}