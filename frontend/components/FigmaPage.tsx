import Head from "next/head";
import type { MouseEvent, ReactNode } from "react";

type FigmaPageProps = {
  title: string;
  children: ReactNode;
};

export function FigmaPage({ title, children }: FigmaPageProps) {
  const pageTitle = `${title} | NexusGuard`;

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const routeTarget = (event.target as HTMLElement).closest<HTMLElement>("[data-route]");
    const route = routeTarget?.dataset.route;

    if (!route) {
      return;
    }

    event.preventDefault();
    window.location.href = route;
  }

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <div onClick={handleClick}>{children}</div>
    </>
  );
}
