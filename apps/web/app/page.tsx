import LandingPage from "@/components/marketing/landing-page";

export default function HomePage() {
  // Marketing page - no auth check needed
  // Signed-in users can click "Dashboard" in nav
  return <LandingPage />;
}
