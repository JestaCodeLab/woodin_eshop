import Image from "next/image";

interface CoverImageProps {
  src: string;
  alt: string;
  /** CSS object-position crop copied from the design, e.g. "50% 30%". */
  pos?: string;
  /** Optional zoom used by print close-ups (scales around the crop point). */
  zoom?: number;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/**
 * Fills its nearest `relative overflow-hidden` parent with a cropped image.
 * The design relies heavily on object-position crops of the same campaign shots.
 */
export function CoverImage({
  src,
  alt,
  pos = "50% 50%",
  zoom,
  sizes,
  priority,
  className = "",
}: CoverImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
      style={{
        objectPosition: pos,
        ...(zoom ? { transform: `scale(${zoom})`, transformOrigin: pos } : null),
      }}
    />
  );
}
