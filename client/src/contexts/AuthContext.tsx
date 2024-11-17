import { createContext, useContext, useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'

import type { User, AuthError } from '@supabase/supabase-js'



interface AuthContextType {

  user: User | null

  loading: boolean

  signIn: (email: string) => Promise<{ error: AuthError | null }>

  signOut: () => Promise<void>

  isAuthenticated: boolean

}



const AuthContext = createContext<AuthContextType | undefined>(undefined)



export function AuthProvider({ children }: { children: React.ReactNode }) {

  const [user, setUser] = useState<User | null>(null)

  const [loading, setLoading] = useState(true)



  useEffect(() => {

    // Check active sessions

    supabase.auth.getSession().then(({ data: { session } }) => {

      setUser(session?.user ?? null)

      setLoading(false)

    })



    // Listen for auth changes

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {

      setUser(session?.user ?? null)

    })



    return () => subscription.unsubscribe()

  }, [])



  const signIn = async (email: string) => {

    return supabase.auth.signInWithOtp({

      email,

      options: {

        emailRedirectTo: `${window.location.origin}/auth/callback`

      }

    })

  }



  const signOut = async () => {

    await supabase.auth.signOut()

  }



  return (

    <AuthContext.Provider value={{ user, loading, signIn, signOut, isAuthenticated: user !== null }}>

      {children}

    </AuthContext.Provider>

  )

}



export function useAuth() {

  const context = useContext(AuthContext)

  if (context === undefined) {

    throw new Error('useAuth must be used within an AuthProvider')

  }

  return context

} 
