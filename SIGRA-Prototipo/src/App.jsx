import { useState } from "react";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return <Auth onAuthSuccess={setUser} />;
  }
  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}