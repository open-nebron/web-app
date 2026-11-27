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
import { registerSchema, type RegisterFormData } from '@/lib/schemas';

export function RegisterForm() {
  const { register, isRegistering } = useAuth();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const emailValue = form.watch('email');

  const onSubmit = async (values: RegisterFormData) => {
    form.clearErrors('root');
    try {
      await register(values);
    } catch (err: unknown) {
      const error = err as {
        status?: number;
        data?: { error?: { code?: string; message?: string } };
      };
      if (
        error?.status === 409 ||
        error?.data?.error?.code === 'EMAIL_ALREADY_EXISTS' ||
        error?.data?.error?.code === 'CONFLICT'
      ) {
        form.setError('email', {
          message: 'An account with this email already exists',
        });
      } else {
        form.setError('root', {
          message: getAuthFormErrorMessage(err, 'register'),
        });
      }
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-muted">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Create an Account
        </CardTitle>
        <CardDescription>
          Join Nebron with your email and password
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
                      disabled={isRegistering}
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
                      placeholder="At least 12 characters (letters & numbers)"
                      autoComplete="new-password"
                      disabled={isRegistering}
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

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      disabled={isRegistering}
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
              loading={isRegistering}
              disabled={isRegistering}
            >
              Register & Continue
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center border-t py-4">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline underline-offset-4"
          >
            Sign In
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

