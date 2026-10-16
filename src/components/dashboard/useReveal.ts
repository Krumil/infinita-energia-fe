import { useCallback, useState, type CSSProperties } from "react";

const LAND_STAGGER_MS = 70;

// A tall batch stops cascading here, so its last card never waits long.
const LAND_STAGGER_STEPS = 4;

// A card lands once it's a little way into view, so its arrival happens where it can be seen.
const LAND_LINE = 0.92;

const pendingReveals = new Map<Element, (delay: number) => void>();

let revealObserver: IntersectionObserver | null = null;

// Cards in view at mount share one cascade, in commit order, which is reading order on the dashboard. A list
// rather than a counter, so StrictMode attaching each ref twice doesn't skip places.
let mountCascade: Element[] = [];

function staggerDelay(index: number): number {
    return Math.min(index, LAND_STAGGER_STEPS) * LAND_STAGGER_MS;
}

/** Elements entering the viewport together land in reading order, top to bottom and then left to right. */
function observeReveal(element: Element, reveal: (delay: number) => void): () => void {
    revealObserver ??= new IntersectionObserver(
        (entries) => {
            entries
                .filter((entry) => entry.isIntersecting)
                .sort(
                    (a, b) =>
                        a.boundingClientRect.top - b.boundingClientRect.top ||
                        a.boundingClientRect.left - b.boundingClientRect.left,
                )
                .forEach((entry, index) => {
                    revealObserver?.unobserve(entry.target);
                    pendingReveals.get(entry.target)?.(staggerDelay(index));
                    pendingReveals.delete(entry.target);
                });
        },
        { rootMargin: `0px 0px -${Math.round((1 - LAND_LINE) * 100)}% 0px` },
    );

    pendingReveals.set(element, reveal);
    revealObserver.observe(element);

    return () => {
        pendingReveals.delete(element);
        revealObserver?.unobserve(element);
    };
}

/** Lands every element still waiting to scroll into view, so the HTML export holds all their charts. */
export function landPending(): void {
    pendingReveals.forEach((reveal, element) => {
        revealObserver?.unobserve(element);
        reveal(0);
    });
    pendingReveals.clear();
}

interface RevealState<T> {
    /** The callback ref for the element that lands. */
    attach: (element: T | null) => (() => void) | undefined;
    landed: boolean;
    className: string;
    style: CSSProperties;
}

/**
 * Lands an element the first time it's in view. Until then its animation sits paused on the first keyframe, so
 * nothing hides it but the animation itself and the HTML export (which turns animations off) never captures a
 * card that hasn't landed. The cascade runs on animation-delay, so a busy main thread can't bunch it up.
 */
export function useReveal<T extends HTMLElement>(): RevealState<T> {
    const [landing, setLanding] = useState<number | null>(null);

    // Measured as the element attaches: waiting for the observer's first callback would leave cards in view
    // blank until the charts finish their mount work.
    const attach = useCallback((element: T | null): (() => void) | undefined => {
        if (!element) return undefined;

        const { top, bottom } = element.getBoundingClientRect();

        if (top < window.innerHeight * LAND_LINE && bottom > 0) {
            if (mountCascade.length === 0) queueMicrotask(() => (mountCascade = []));

            if (!mountCascade.includes(element)) mountCascade.push(element);

            setLanding(staggerDelay(mountCascade.indexOf(element)));

            return undefined;
        }

        return observeReveal(element, setLanding);
    }, []);

    return {
        attach,
        landed: landing !== null,
        className: "animate-card-land motion-reduce:animate-fade-quick",
        style:
            landing !== null
                ? { animationPlayState: "running", animationDelay: `${landing}ms` }
                : { animationPlayState: "paused" },
    };
}
