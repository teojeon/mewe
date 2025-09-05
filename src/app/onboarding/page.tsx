// src/app/onboarding/page.tsx
import OnboardingForm from "./ui/OnboardingForm";

export default function OnboardingPage({ searchParams }: { searchParams: { [k: string]: string | undefined } }) {
  const next = searchParams.next || "/";
  return <OnboardingForm next={next} />;
}
