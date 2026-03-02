import Link from "next/link";
import { APP_NAME, TACO_EMOJI } from "@/lib/constants";

const features = [
  {
    icon: TACO_EMOJI,
    title: "Daily Recognition",
    description:
      "Give tacos to teammates to recognize their hard work and contributions. Everyone gets 5 tacos per day to share.",
  },
  {
    icon: "🏆",
    title: "Leaderboards",
    description:
      "Track who's giving and receiving the most tacos. Celebrate your team's top contributors weekly and monthly.",
  },
  {
    icon: "🛒",
    title: "Taco Shop",
    description:
      "Redeem your earned tacos for real rewards like gift cards, extra PTO, team lunches, and company swag.",
  },
  {
    icon: "💬",
    title: "Slack Integration",
    description:
      "Give tacos directly in Slack with a simple command. Recognition happens where your team already works.",
  },
];

const steps = [
  {
    number: "01",
    title: "Give a Taco",
    description:
      "See someone doing great work? Give them a taco with a message explaining why they rock.",
  },
  {
    number: "02",
    title: "Climb the Leaderboard",
    description:
      "As you receive tacos, you'll rise up the leaderboard. Who will be this week's taco champion?",
  },
  {
    number: "03",
    title: "Redeem Rewards",
    description:
      "Cash in your tacos for awesome rewards in the Taco Shop. Real perks for real recognition.",
  },
];

const stats = [
  { value: "50K+", label: "Tacos Given" },
  { value: "500+", label: "Happy Teams" },
  { value: "98%", label: "Satisfaction" },
  { value: "5x", label: "More Recognition" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-amber-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">{TACO_EMOJI}</span>
            <span className="text-xl font-bold text-amber-950">
              {APP_NAME}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 hover:text-amber-800"
            >
              View Demo
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-white shadow-md shadow-amber-500/20 transition-all hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/30"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-50" />

        {/* Decorative floating tacos */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[10%] top-[15%] text-5xl opacity-10 sm:text-7xl">
            {TACO_EMOJI}
          </div>
          <div className="absolute right-[15%] top-[20%] text-4xl opacity-10 sm:text-6xl">
            {TACO_EMOJI}
          </div>
          <div className="absolute bottom-[20%] left-[20%] text-3xl opacity-10 sm:text-5xl">
            {TACO_EMOJI}
          </div>
          <div className="absolute bottom-[30%] right-[10%] text-4xl opacity-10 sm:text-5xl">
            {TACO_EMOJI}
          </div>
          <div className="absolute left-[50%] top-[50%] text-6xl opacity-5 sm:text-8xl">
            {TACO_EMOJI}
          </div>
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-800">
            {TACO_EMOJI} Peer recognition made fun
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-amber-950 sm:text-5xl md:text-6xl">
            Celebrate Your Team
            <br />
            <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
              with Tacos {TACO_EMOJI}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-amber-700/80 sm:text-xl">
            {APP_NAME} makes peer recognition fun, easy, and meaningful. Give
            tacos to celebrate wins, big and small.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-500 px-8 text-base font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:-translate-y-0.5 hover:bg-amber-600 hover:shadow-xl hover:shadow-amber-500/30"
            >
              Get Started Free
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center gap-2 rounded-xl border-2 border-amber-300 bg-transparent px-8 text-base font-semibold text-amber-700 transition-all hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="border-t border-amber-100 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-amber-950 sm:text-4xl">
              Everything you need for team recognition
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-amber-600">
              Simple tools that make saying &ldquo;thank you&rdquo; a part of
              your daily workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-amber-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-100/50"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100 text-2xl transition-transform duration-200 group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold text-amber-950">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-amber-700/70">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gradient-to-b from-amber-50/50 to-white py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-amber-950 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-amber-600">
              Getting started is as easy as one, two, three.
            </p>
          </div>

          <div className="space-y-8 sm:space-y-12">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`flex flex-col items-center gap-6 sm:flex-row ${
                  index % 2 === 1 ? "sm:flex-row-reverse" : ""
                }`}
              >
                {/* Number Circle */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl font-bold text-white shadow-lg shadow-amber-500/20">
                  {step.number}
                </div>

                {/* Content */}
                <div
                  className={`text-center sm:text-left ${index % 2 === 1 ? "sm:text-right" : ""}`}
                >
                  <h3 className="mb-2 text-xl font-bold text-amber-950">
                    {step.title}
                  </h3>
                  <p className="max-w-md text-amber-700/70">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="border-y border-amber-100 bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-extrabold text-white sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-medium text-amber-100">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="text-5xl">{TACO_EMOJI}</span>
          <h2 className="mt-6 text-3xl font-bold text-amber-950 sm:text-4xl">
            Ready to start giving tacos?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-amber-600">
            Join hundreds of teams who are already making recognition a daily
            habit. It takes less than 2 minutes to set up.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-500 px-8 text-base font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:-translate-y-0.5 hover:bg-amber-600 hover:shadow-xl hover:shadow-amber-500/30"
            >
              Get Started Free
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-amber-600 underline-offset-4 transition-colors hover:text-amber-700 hover:underline"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-amber-100 bg-amber-50/50 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="text-xl">{TACO_EMOJI}</span>
              <span className="font-bold text-amber-950">{APP_NAME}</span>
            </div>
            <p className="text-sm text-amber-500">
              Made with {TACO_EMOJI} for awesome teams everywhere.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
