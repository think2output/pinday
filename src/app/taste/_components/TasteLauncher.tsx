"use client";

import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { tripActions } from "@/lib/trip/store";
import { TasteTestModal } from "./TasteTestModal";

const subscribeMounted = () => () => {};

export function TasteLauncher({ children, className }: { children: ReactNode; className: string }) {
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  return <>
    <button ref={trigger} type="button" disabled={!mounted} aria-haspopup="dialog" onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); setOpen(true); }} className={className}>{children}</button>
    {open && <TasteTestModal onClose={() => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true })); }} onComplete={(taste) => {
      tripActions.setTaste(taste);
      setOpen(false);
      router.push(`/taste?result=${taste}`);
    }} onSaved={(taste) => { setOpen(false); router.push(`/taste?result=${taste}`); }} />}
  </>;
}
