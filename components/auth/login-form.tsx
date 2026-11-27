'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { EmailTypoHint } from '@/components/auth/email-typo-hint';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/hooks/use-auth';
import { getAuthFormErrorMessage } from '@/lib/auth-errors';
import { loginSchema, type LoginFormData } from '@/lib/schemas';

export function LoginForm() {
  const { login, isLoggingIn } = useAuth();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const emailValue = form.watch('email');

  const onSubmit = async (values: LoginFormData) => {
    form.clearErrors('root');
    try {
      await login(values);
    } catch (err: unknown) {
      form.setError('root', {
        message: getAuthFormErrorMessage(err, 'login'),
      });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-muted">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Welcome to Nebron
        </CardTitle>
        <CardDescription>
          Enter your email and password to sign in
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={isLoggingIn}
                      {...field}
                      onChange={(e) => {
                        form.clearErrors('root');
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <EmailTypoHint
                    email={emailValue}
                    onAccept={(corrected) => {
                      form.setValue('email', corrected, { shouldValidate: true });
                      form.clearErrors('root');
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      disabled={isLoggingIn}
                      {...field}
                      onChange={(e) => {
                        form.clearErrors('root');
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AuthErrorAlert message={form.formState.errors.root?.message} />

            <Button
              type="submit"
              className="w-full mt-2"
              loading={isLoggingIn}
              disabled={isLoggingIn}
            >
              Sign In
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center border-t py-4">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline underline-offset-4"
          >
            Create account
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

