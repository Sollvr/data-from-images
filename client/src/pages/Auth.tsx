import { useState } from 'react'

import { supabase } from '@/lib/supabase'

import { Card } from '@/components/ui/card'

import { Input } from '@/components/ui/input'

import { Button } from '@/components/ui/button'

import { Loader2, Mail, AlertCircle } from 'lucide-react'

import { useToast } from '@/hooks/use-toast'

import { Alert, AlertDescription } from '@/components/ui/alert'



export default function Auth() {

  const [email, setEmail] = useState('')

  const [loading, setLoading] = useState(false)

  const [sent, setSent] = useState(false)

  const { toast } = useToast()



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault()

    setLoading(true)



    try {

      const { error } = await supabase.auth.signInWithOtp({

        email,

        options: {

          emailRedirectTo: `${window.location.origin}/auth/callback`,

        },

      })



      if (error) {

        console.error('Supabase error:', error)

        throw error

      }



      setSent(true)

      toast({

        title: "Check your email",

        description: "We've sent you a magic link to sign in.",

      })

    } catch (error: any) {

      console.error('Auth error:', error)

      toast({

        variant: "destructive",

        title: "Error",

        description: error.message || "Failed to send magic link",

      })

      setSent(false)

    } finally {

      setLoading(false)

    }

  }



  return (

    <div className="container mx-auto flex items-center justify-center min-h-screen p-6">

      <Card className="w-full max-w-md p-6 space-y-6">

        <h1 className="text-2xl font-bold text-center">Sign In</h1>

        

        {sent ? (

          <Alert>

            <Mail className="h-4 w-4" />

            <AlertDescription>

              Check your email for the magic link to sign in.

              <br />

              You can close this window.

            </AlertDescription>

          </Alert>

        ) : (

          <>

            <p className="text-center text-muted-foreground">

              Enter your email to receive a magic link

            </p>



            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-2">

                <Input

                  type="email"

                  placeholder="Email"

                  value={email}

                  onChange={(e) => setEmail(e.target.value)}

                  disabled={loading}

                  required

                />

              </div>



              <Button type="submit" className="w-full" disabled={loading}>

                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}

                Send Magic Link

              </Button>

            </form>

          </>

        )}

      </Card>

    </div>

  )

} 






