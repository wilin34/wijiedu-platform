import { useAuth } from "@/_core/hooks/useAuth";
import AcademicWorkspace from "@/components/AcademicWorkspace";
import RequiredPasswordChange from "@/components/RequiredPasswordChange";
import Register from "./Register";

export default function Home() {
  const { user } = useAuth();
  return user ? (user.mustChangePassword ? <RequiredPasswordChange /> : <AcademicWorkspace />) : <Register />;
}
