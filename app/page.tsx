import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/sections/HowItWorks";
import TrendingCases from "@/components/home/TrendingCases";
import WhyJusticePool from "@/components/sections/WhyJusticePool";
import CalltoAction from "@/components/sections/CalltoAction";

import { createClient } from "@/lib/supabase-server";

export default async function Home() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cases")
    .select(
      "id, title, category, raised, goal, supporters, views, days_left, created_at",
    )
    .eq("status", "active");

  if (error) {
    throw new Error(error.message);
  }

  const trendingCases = [...(data ?? [])]
    .sort((a, b) => {
      const aScore =
        (Number(a.views) || 0) +
        (Number(a.supporters) || 0) * 8 +
        (Number(a.raised) || 0) * 0.02;

      const bScore =
        (Number(b.views) || 0) +
        (Number(b.supporters) || 0) * 8 +
        (Number(b.raised) || 0) * 0.02;

      return bScore - aScore;
    })
    .slice(0, 3);

  return (
    <>
      <Navbar />

      <main>
        <Hero />

        <HowItWorks />

        <TrendingCases cases={trendingCases} />

        <WhyJusticePool />

        <CalltoAction />
      </main>

      <Footer />
    </>
  );
}