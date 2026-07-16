const NBSP = " ";

/** Wraps each character in its own span so the sidebar's collapse GSAP
 * timeline can stagger them in/out, rather than the whole label just
 * fading as one flat block. */
export function SplitLetters({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((ch, i) => (
        <span key={i} className="letter inline-block">
          {ch === " " ? NBSP : ch}
        </span>
      ))}
    </>
  );
}
