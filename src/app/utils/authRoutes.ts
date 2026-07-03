export function isAuthPathname(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  return (
    pathname === "/" ||
    pathname === "/features/auth/Login" ||
    pathname === "/features/auth/Register"
  );
}
