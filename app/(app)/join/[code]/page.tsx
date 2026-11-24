import { JoinViaLink } from '@/components/groups/join-via-link';

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

export const metadata = {
  title: 'Join Group | Nebron',
};

export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params;
  return <JoinViaLink code={code} />;
}
