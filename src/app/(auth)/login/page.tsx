import LoginScreen from "@/components/LoginScreen";
import { firebaseAuthConfigured } from "@/lib/firebase/auth";

export const dynamic = "force-dynamic";
export default function LoginPage() {
  return <LoginScreen loginReady={firebaseAuthConfigured()} />;
}
