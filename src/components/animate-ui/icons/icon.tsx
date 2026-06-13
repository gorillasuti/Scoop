"use client";

import React, { createContext, useContext, forwardRef, useImperativeHandle, useRef, useCallback } from "react";
import { useAnimation } from "motion/react";

type AnimationControls = ReturnType<typeof useAnimation>;

interface AnimateIconContextType {
  controls: AnimationControls;
}

const AnimateIconContext = createContext<AnimateIconContextType | null>(null);

export function useAnimateIconContext() {
  const context = useContext(AnimateIconContext);
  if (!context) {
    throw new Error("useAnimateIconContext must be used within an IconWrapper");
  }
  return context;
}

export function getVariants(animations: any, variant?: string) {
  if (variant && animations[variant]) {
    return animations[variant];
  }
  return animations.default || animations;
}

export interface IconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

export interface IconProps<T = string> extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  variant?: T;
}

interface WrapperProps extends IconProps {
  icon: React.ComponentType<any>;
}

export const IconWrapper = forwardRef<IconHandle, WrapperProps>(
  ({ icon: IconComponent, onMouseEnter, onMouseLeave, className, size = 28, variant, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => {
          controls.stop();
          controls.set("initial");
          setTimeout(() => {
            controls.start("animate");
          }, 20);
        },
        stopAnimation: () => {
          controls.stop();
          controls.set("initial");
          return controls.start("initial");
        },
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.stop();
          controls.set("initial");
          setTimeout(() => {
            controls.start("animate");
          }, 20);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.stop();
          controls.set("initial");
          return controls.start("initial");
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <AnimateIconContext.Provider value={{ controls }}>
        <div
          className={className}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          {...props}
        >
          <IconComponent size={size} variant={variant} />
        </div>
      </AnimateIconContext.Provider>
    );
  }
);

IconWrapper.displayName = "IconWrapper";
