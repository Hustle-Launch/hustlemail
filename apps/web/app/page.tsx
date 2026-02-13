import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LandingPage from "@/components/marketing/landing-page";

export default async function HomePage() {
  const { userId } = await auth();
  
  // If user is signed in, redirect to inbox
  if (userId) {
    redirect("/mail/inbox");
  }
  
  // Otherwise, show the marketing page
  return <LandingPage />;
}
