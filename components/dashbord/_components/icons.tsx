"use client";

export function IconRefresh(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={props.className ?? "h-4 w-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9c2.7 0 5.1 1.2 6.8 3.1" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function IconChevronDown(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={props.className ?? "h-4 w-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconUser(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={props.className ?? "h-4 w-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <path d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
    </svg>
  );
}

export function IconStop(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={props.className ?? "h-4 w-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M7 7h10v10H7z" />
    </svg>
  );
}

export function IconPause(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={props.className ?? "h-4 w-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M8 6v12" />
      <path d="M16 6v12" />
    </svg>
  );
}