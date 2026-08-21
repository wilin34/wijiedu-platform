import { useAuth } from "@/_core/hooks/useAuth";
import AcademicWorkspace from "@/components/AcademicWorkspace";
import Register from "./Register";

export default function Home() {
  const { user } = useAuth();
  return user ? <AcademicWorkspace /> : <Register />;
}
