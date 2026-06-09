import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/host")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/host") {
      throw redirect({ to: "/host/" });
    }
  },
  component: () => <Outlet />,
});
