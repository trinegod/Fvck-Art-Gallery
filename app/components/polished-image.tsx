"use client";

import {
  useCallback,
  useState,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageStatus = "loading" | "loaded" | "error";

type PolishedImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "onError" | "onLoad" | "src"
> & {
  src: string;
  wrapperClassName?: string;
  fallbackText?: string;
};

export default function PolishedImage({
  src,
  alt,
  className,
  wrapperClassName,
  fallbackText = "Preview unavailable",
  ...props
}: PolishedImageProps) {
  const [imageState, setImageState] = useState<{
    src: string;
    status: ImageStatus;
  }>({ src, status: "loading" });
  const status = imageState.src === src ? imageState.status : "loading";

  const updateStatus = useCallback(
    (nextStatus: ImageStatus) => {
      setImageState((current) =>
        current.src === src && current.status === nextStatus
          ? current
          : { src, status: nextStatus }
      );
    },
    [src]
  );

  const setImageRef = useCallback(
    (image: HTMLImageElement | null) => {
      if (!image?.complete) return;
      updateStatus(image.naturalWidth > 0 ? "loaded" : "error");
    },
    [updateStatus]
  );

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    updateStatus(event.currentTarget.naturalWidth > 0 ? "loaded" : "error");
  }

  return (
    <span
      className={cn(
        "relative isolate block overflow-hidden bg-zinc-900",
        wrapperClassName
      )}
      data-image-state={status}
    >
      {status === "loading" && (
        <span
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(103,232,249,0.10),transparent_58%)]"
        >
          <span className="nodeine-image-shimmer absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </span>
      )}

      {/* Native images support unknown local and creator-provided remote sources. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={setImageRef}
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={() => updateStatus("error")}
        className={cn(
          "transition-opacity duration-700 ease-out",
          status === "loaded" ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />

      {status === "error" && (
        <span
          role="img"
          aria-label={alt ? `${alt} could not be loaded` : fallbackText}
          className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_20%,rgba(103,232,249,0.10),transparent_55%)] px-4 text-center"
        >
          <span className="flex flex-col items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            <ImageOff className="size-5 text-zinc-600" aria-hidden="true" />
            {fallbackText}
          </span>
        </span>
      )}
    </span>
  );
}
