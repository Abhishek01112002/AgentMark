import { TouchEvent, MouseEvent } from 'react';

type StyleSetter = (el: HTMLElement) => void;

export function hoverHandlers(enterStyle: StyleSetter, leaveStyle: StyleSetter) {
  return {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => enterStyle(e.currentTarget),
    onMouseLeave: (e: MouseEvent<HTMLElement>) => leaveStyle(e.currentTarget),
    onTouchStart: (e: TouchEvent<HTMLElement>) => enterStyle(e.currentTarget),
    onTouchEnd: (e: TouchEvent<HTMLElement>) => leaveStyle(e.currentTarget),
    onTouchCancel: (e: TouchEvent<HTMLElement>) => leaveStyle(e.currentTarget),
  };
}
