"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { tripActions } from "@/lib/trip/store";
import { TasteTestModal } from "./TasteTestModal";

export function TasteLauncher({ children, className }: { children: ReactNode; className: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return <>
    <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={className}>{children}</button>
    {open && <TasteTestModal onClose={() => setOpen(false)} onComplete={(taste) => {
      tripActions.setTaste(taste);
      setOpen(false);
      router.push(`/taste?result=${taste}`);
    }} onSaved={(taste) => { setOpen(false); router.push(`/taste?result=${taste}`); }} />}
  </>;
}
