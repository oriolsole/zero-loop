
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FormValues {
  email: string;
  password: string;
}

const AuthForm: React.FC = () => {
  const { signIn, signUp, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const handleSubmit = async (data: FormValues) => {
    try {
      setError(null);
      if (activeTab === 'login') {
        await signIn(data.email, data.password);
        navigate('/');
      } else {
        await signUp(data.email, data.password);
        // Don't navigate after signup - wait for email verification
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">ZeroLoop</CardTitle>
        <CardDescription>
          {activeTab === 'login' 
            ? 'Sign in to your account to continue' 
            : 'Create a new account to get started'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="your@email.com" 
                        {...field} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                rules={{
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="******" 
                        {...field} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {activeTab === 'login' ? 'Logging in...' : 'Signing up...'}
                  </>
                ) : (
                  activeTab === 'login' ? 'Login' : 'Sign Up'
                )}
              </Button>
            </form>
          </Form>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center text-center text-sm text-muted-foreground">
        {activeTab === 'login' ? (
          <p>Don't have an account? <Button variant="link" className="p-0" onClick={() => setActiveTab('signup')}>Sign up</Button></p>
        ) : (
          <p>Already have an account? <Button variant="link" className="p-0" onClick={() => setActiveTab('login')}>Login</Button></p>
        )}
      </CardFooter>
    </Card>
  );
};

export default AuthForm;
