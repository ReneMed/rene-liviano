import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/", "/dashboard", "/linked-evidence", "/api/visits/:path*", "/api/panel-stats"],
};
