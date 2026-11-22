'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, X, AlertCircle } from 'lucide-react';
import { useProfile, useUpdateProfile, useUpdateUsername } from '@/hooks/use-profile';
import { useMeta } from '@/hooks/use-meta';
import { coreApi } from '@/lib/api';
import { profileEditSchema, type ProfileEditFormData } from '@/lib/schemas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AvatarUploader } from '@/components/profile/avatar-uploader';
import { BannerUploader } from '@/components/profile/banner-uploader';
import { toast } from '@/components/ui/use-toast';

export function ProfileEditForm() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: meta } = useMeta();
  const updateProfile = useUpdateProfile();
  const updateUsername = useUpdateUsername();

  const [usernameAvailability, setUsernameAvailability] = React.useState<{
    checking: boolean;
    available?: boolean;
    reason?: string;
  }>({ checking: false });

  const form = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      name: profile?.name || '',
      username: profile?.username || '',
      bio: profile?.bio || '',
      about: profile?.about || '',
      dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
      language: profile?.language || 'en',
      theme: profile?.theme || 'system',
    },
    mode: 'onChange',
  });

  const { watch, formState } = form;
  const currentUsernameInput = watch('username');
  const bioValue = watch('bio') || '';
  const aboutValue = watch('about') || '';

  // Debounced check for username availability
  React.useEffect(() => {
    if (!currentUsernameInput) return;
    if (currentUsernameInput === profile?.username) {
      setUsernameAvailability({ checking: false, available: true });
      return;
    }

    if (currentUsernameInput.length < 3) {
      setUsernameAvailability({ checking: false, available: false, reason: 'Too short' });
      return;
    }

    setUsernameAvailability({ checking: true });
    const timer = setTimeout(async () => {
      try {
        const res = await coreApi.checkUsername(currentUsernameInput);
        setUsernameAvailability({
          checking: false,
          available: res.available,
          reason: res.reason,
        });
      } catch {
        setUsernameAvailability({ checking: false, available: false, reason: 'Error checking' });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [currentUsernameInput, profile?.username]);

  const isSaving = updateProfile.isPending || updateUsername.isPending;
  const isDirty = formState.isDirty;

  const onSubmit = async (values: ProfileEditFormData) => {
    try {
      // 1. If username changed, update it first
      if (values.username !== profile?.username) {
        if (!usernameAvailability.available) {
          form.setError('username', {
            message: 'Username is not available or invalid',
          });
          return;
        }
        await updateUsername.mutateAsync(values.username);
      }

      // 2. Update remaining profile fields
      const patch: Record<string, unknown> = {};
      if (values.name !== profile?.name) patch.name = values.name || null;
      if (values.bio !== profile?.bio) patch.bio = values.bio || null;
      if (values.about !== profile?.about) patch.about = values.about || null;
      if (values.dateOfBirth !== (profile?.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '')) {
        patch.dateOfBirth = values.dateOfBirth || null;
      }
      if (values.language !== profile?.language) patch.language = values.language;
      if (values.theme !== profile?.theme) patch.theme = values.theme;

      if (Object.keys(patch).length > 0) {
        await updateProfile.mutateAsync(patch);
      }

      toast({
        title: 'Profile updated',
        description: 'Your changes have been saved.',
      });

      router.push('/profile');
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error.message || 'Could not save profile changes.',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Banner Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Banner Image</CardTitle>
          <CardDescription>
            Personalize your profile header with a cover photo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BannerUploader />
        </CardContent>
      </Card>

      {/* Avatar Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
          <CardDescription>
            Upload a profile picture to represent yourself on Nebron
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUploader />
        </CardContent>
      </Card>

      {/* Form Fields Card */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your display name, username handle, and details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your full name"
                        disabled={isSaving}
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>Max 80 characters.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Username */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username Handle</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          placeholder="username"
                          autoCapitalize="none"
                          disabled={isSaving}
                          {...field}
                          className="pr-10"
                        />
                      </FormControl>
                      <div className="absolute right-3 top-2.5 text-xs">
                        {usernameAvailability.checking && (
                          <span className="text-muted-foreground animate-pulse">
                            Checking...
                          </span>
                        )}
                        {!usernameAvailability.checking &&
                          usernameAvailability.available && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        {!usernameAvailability.checking &&
                          usernameAvailability.available === false && (
                            <span className="flex items-center text-destructive text-xs">
                              <X className="h-4 w-4 mr-1" />
                              {usernameAvailability.reason || 'Unavailable'}
                            </span>
                          )}
                      </div>
                    </div>
                    <FormDescription>
                      3-20 lowercase alphanumeric characters, dots, and underscores.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bio with counter */}
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Short Bio</FormLabel>
                      <span className="text-xs text-muted-foreground">
                        {bioValue.length}/300
                      </span>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="A brief tagline or bio"
                        maxLength={300}
                        rows={2}
                        disabled={isSaving}
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* About with counter */}
              <FormField
                control={form.control}
                name="about"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>About</FormLabel>
                      <span className="text-xs text-muted-foreground">
                        {aboutValue.length}/2000
                      </span>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Tell the community more about yourself..."
                        maxLength={2000}
                        rows={5}
                        disabled={isSaving}
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date of Birth */}
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        disabled={isSaving}
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Must be at least 13 years old.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preferred Language */}
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Language</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSaving}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {meta?.languages.map((l) => (
                          <SelectItem key={l.code} value={l.code}>
                            {l.name} ({l.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/profile')}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSaving}
              disabled={!isDirty || isSaving}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

