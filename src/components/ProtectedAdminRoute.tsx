import { useAdminAuth } from "@/context/AdminAuthContext";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ProtectedAdminRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, login } = useAdminAuth();
  const [password, setPassword] = useState("");

  if (isAuthenticated) return <>{children}</>;

  const handleSubmit = () => {
    if (login(password)) {
      toast.success("Access granted.");
    } else {
      toast.error("Incorrect password.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen max-w-md mx-auto space-y-4 p-6">
      <h1 className="text-2xl font-bold">Admin Login</h1>
      <Input
        type="password"
        placeholder="Enter Admin Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown} // Listen for Enter key
      />
      <Button onClick={handleSubmit}>Login</Button>
    </div>
  );
}
