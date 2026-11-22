"use client";

/**
 * Cinematic media primitives for the portal homepage (Task 4-a).
 *
 * - CinematicVideo: a silent looping <video> that only plays while it is
 *   actually visible (IntersectionObserver, >= 25% of the element in view)
 *   to save bandwidth and battery. `preload="none"` + a poster keeps the
 *   initial cost at a single still, and playback pauses as soon as the
 *   band scrolls out of view. iOS-safe: muted + playsInline.
 *   Users with `prefers-reduced-motion: reduce` get the poster still and
 *   no autoplay at all.
 * - Reveal: the shared scroll-reveal wrapper used across homepage
 *   sections (framer-motion whileInView, 24px rise + fade in, once,
 *   80px viewport margin, 0.6s easeOut) with optional stagger delay.
 *   Reduced-motion users get no entrance animation.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Cinematic video (lazy, looping, silent) ───────────────────────────

export function CinematicVideo({
  src,
  poster,
  className,
  overlayClassName,
  eager = false,
}: {
  src: string;
  poster: string;
  /** Extra classes for the <video> element (already absolute + object-cover). */
  className?: string;
  /** Classes for an optional gradient overlay rendered above the video. */
  overlayClassName?: string;
  /** Above-the-fold usage (hero): autoplay is allowed from first paint. */
  eager?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  // Autoplay stays off until the video has actually been seen once, so that
  // preload="none" is honored for below-the-fold bands (no eager downloads).
  const [armed, setArmed] = useState(eager);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Reduced motion: never autoplay — the poster still is the visual.
    if (reduced) {
      video.pause();
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      // No IO support: fall back to playing once the browser is idle-ish.
      const id = setTimeout(() => {
        setArmed(true);
        void video.play().catch(() => undefined);
      }, 0);
      return () => clearTimeout(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= 0.25) {
            setArmed(true);
            if (video.paused) void video.play().catch(() => undefined);
          } else if (!video.paused) {
            video.pause();
          }
        }
      },
      { threshold: [0, 0.25] }
    );
    io.observe(video);
    return () => io.disconnect();
  }, [reduced, src]);

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        autoPlay={armed && !reduced}
        muted
        loop
        playsInline
        preload="none"
        poster={poster}
        aria-hidden="true"
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
      />
      {overlayClassName && (
        <div
          aria-hidden="true"
          className={cn("pointer-events-none absolute inset-0", overlayClassName)}
        />
      )}
    </>
  );
}

// ── Scroll-reveal wrapper (subtle, once) ──────────────────────────────

const REVEAL_TAGS = {
  div: motion.div,
  li: motion.li,
  span: motion.span,
  ul: motion.ul,
  ol: motion.ol,
  nav: motion.nav,
} as const;

export function Reveal({
  as = "div",
  className,
  delay = 0,
  children,
}: {
  as?: keyof typeof REVEAL_TAGS;
  className?: string;
  /** Small stagger delay in seconds for sibling cards. */
  delay?: number;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const Motion = REVEAL_TAGS[as];
  return (
    <Motion
      className={className}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut", delay: reduced ? 0 : delay }}
    >
      {children}
    </Motion>
  );
}
