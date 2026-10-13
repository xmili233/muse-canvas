import { useLayoutEffect } from "react";

export function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function motionAllowed() {
  return (
    !reducedMotion() && document.documentElement.dataset.input !== "keyboard"
  );
}

export function motionEasing(name = "ease-out") {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim();
}

export function useMotionPreferences() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const pointer = () => {
      root.dataset.input = "pointer";
    };
    const keyboard = () => {
      root.dataset.input = "keyboard";
    };
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", keyboard, true);
    const frame = requestAnimationFrame(() => {
      root.dataset.motionReady = "true";
    });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("keydown", keyboard, true);
      delete root.dataset.motionReady;
    };
  }, []);
}

export function revealElements(elements: HTMLElement[]) {
  if (document.documentElement.dataset.input === "keyboard") return;
  const reduced = reducedMotion();
  const easing = motionEasing();
  for (const [index, element] of elements.entries()) {
    element.animate(
      [
        {
          opacity: 0,
          transform: reduced ? "none" : "translateY(8px) scale(0.98)",
        },
        { opacity: 1, transform: "none" },
      ],
      {
        duration: reduced ? 100 : 200,
        delay: reduced ? 0 : Math.min(index, 2) * 40,
        easing,
      },
    );
  }
}
