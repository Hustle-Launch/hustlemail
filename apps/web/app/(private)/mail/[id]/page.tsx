import { AuthenticatedMail } from "@/components/workspace/authenticated-mail";
export default async function MessagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AuthenticatedMail initialMessageId={id} />;
}
