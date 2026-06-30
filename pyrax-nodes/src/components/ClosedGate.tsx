// SPDX-License-Identifier: LicenseRef-Proprietary
// Shown across the public site when the team has "closed" it from the portal — a branded coming-soon
// with the notify signup so visitors can subscribe to be told when it opens.
import React from "react";
import { BrandMark } from "./ui";
import NotifyForm from "./NotifyForm";

export default function ClosedGate({ message }: { message: string }) {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[860px] -translate-x-1/2 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(closest-side, rgba(245,134,34,0.22), transparent)" }} />
      </div>
      <div className="grid w-full max-w-5xl items-center gap-10 md:grid-cols-2">
        <div>
          <BrandMark variant="horizontal" className="h-9 w-[6.6rem]" />
          <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl">Opening <span className="flame-text">soon</span></h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">{message}</p>
          <div className="mt-5 flex items-center gap-2 text-sm text-faint">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-brand)] opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--color-brand)]" /></span>
            The network is live — the public portal is being prepared.
          </div>
        </div>
        <NotifyForm />
      </div>
    </div>
  );
}
