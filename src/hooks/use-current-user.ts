import { useState, useEffect } from "react";

interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
  isAdmin: boolean;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  return user;
}
