import { Suspense } from "react";
import { AppSkeleton } from "@/components/AppSkeleton";
import { SecuriLogApp } from "@/components/SecuriLogApp";

export default function Home() {
  return (
    <Suspense fallback={<AppSkeleton />}>
      <SecuriLogApp />
    </Suspense>
  );
}
