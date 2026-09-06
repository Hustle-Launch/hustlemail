import { AuthenticatedMail } from "@/components/workspace/authenticated-mail";
export default function MailPage() {
  return <AuthenticatedMail initialFolder="archive" />;
}
