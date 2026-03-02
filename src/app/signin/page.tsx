"use client";

import { signIn } from "next-auth/react";
import { APP_NAME, TACO_EMOJI } from "@/lib/constants";

export default function SignInPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4">
      {/* Floating decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-bounce text-3xl opacity-10"
            style={{
              left: `${10 + i * 12}%`,
              top: `${15 + (i % 4) * 20}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + (i % 3)}s`,
            }}
          >
            {TACO_EMOJI}
          </div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-6xl block mb-3">{TACO_EMOJI}</span>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
            {APP_NAME}
          </h1>
          <p className="mt-2 text-amber-600/70 text-sm">
            Celebrate your team with tacos
          </p>
        </div>

        {/* Sign-in card */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-amber-100 shadow-xl shadow-amber-100/30 p-8">
          <h2 className="text-lg font-semibold text-amber-950 text-center mb-2">
            Welcome back!
          </h2>
          <p className="text-sm text-amber-600/70 text-center mb-6">
            Sign in with your Slack workspace to continue
          </p>

          <button
            onClick={() => signIn("slack", { callbackUrl: "/dashboard" })}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#4A154B] hover:bg-[#3a1139] text-white font-semibold py-3 px-4 transition-all duration-200 shadow-lg shadow-purple-900/20 hover:shadow-purple-900/30 hover:-translate-y-0.5"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 54 54"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g fill="none" fillRule="evenodd">
                <path
                  d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386"
                  fill="#36C5F0"
                />
                <path
                  d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387"
                  fill="#2EB67D"
                />
                <path
                  d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386"
                  fill="#ECB22E"
                />
                <path
                  d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336-.001v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.249a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387"
                  fill="#E01E5A"
                />
              </g>
            </svg>
            Sign in with Slack
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-amber-400">
          Only members of your Slack workspace can sign in
        </p>
      </div>
    </div>
  );
}
