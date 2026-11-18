import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** 24px stroke icons from the design. Decorative: always pair with a labelled control. */
function Icon({ children, size = 20, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </Icon>
);

export const HeartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z" />
  </Icon>
);

export const UserIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Icon>
);

export const BagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 8h14l-1 13H6L5 8z" />
    <path d="M9 8V6a3 3 0 016 0v2" />
  </Icon>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon size={18} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon size={18} {...p}>
    <path d="M9 5l7 7-7 7" />
  </Icon>
);

export const BagPlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 8h14l-1 13H6L5 8z" />
    <path d="M9 8V6a3 3 0 016 0v2" />
    <path d="M12 12v5M9.5 14.5h5" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </Icon>
);

export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);
