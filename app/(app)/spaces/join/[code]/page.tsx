import { SpaceJoinViaLink } from '@/components/spaces/join-via-link';

interface SpaceJoinPageProps {
  params: Promise<{ code: string }>;
}

export const metadata = {
  title: 'Join Space | Nebron',
};

export default async function SpaceJoinPage({ params }: SpaceJoinPageProps) {
  const { code } = await params;
  return <SpaceJoinViaLink code={code} />;
}
