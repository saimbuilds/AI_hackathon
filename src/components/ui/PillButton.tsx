import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Chevron } from "./icons";

type Tone = "sun" | "press" | "cyan" | "leaf" | "ink";
type Common = {
  children: ReactNode;
  tone?: Tone;
  look?: "on-color" | "solid" | "ink";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode; // replaces the arrow
  className?: string;
};
type AsLink = Common & { href: string } & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;
type AsButton = Common & { href?: never } & Omit<ComponentProps<"button">, "className" | "children">;

function Inner({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <>
      <span className="pbtn__label">{children}</span>
      <span className="pbtn__disc" aria-hidden>
        {icon ?? <Chevron className="pbtn__arrow" />}
      </span>
    </>
  );
}

const dataAttrs = (tone: Tone, look: Common["look"], size: Common["size"]) => ({
  "data-tone": tone,
  "data-look": look === "on-color" ? undefined : look,
  "data-size": size === "md" ? undefined : size,
});

/** Label + colored disc. With href it renders a Link, otherwise a <button>. */
export function PillButton(props: AsLink | AsButton) {
  if (props.href !== undefined) {
    const { children, tone = "sun", look = "on-color", size = "md", icon, className, href, ...rest } = props;
    return (
      <Link href={href} className={`pbtn ${className ?? ""}`} {...dataAttrs(tone, look, size)} {...rest}>
        <Inner icon={icon}>{children}</Inner>
      </Link>
    );
  }
  const { children, tone = "sun", look = "on-color", size = "md", icon, className, type = "button", ...rest } = props;
  return (
    <button type={type} className={`pbtn ${className ?? ""}`} {...dataAttrs(tone, look, size)} {...rest}>
      <Inner icon={icon}>{children}</Inner>
    </button>
  );
}
