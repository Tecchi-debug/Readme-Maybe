import { Suspense } from "react";
import Login from "../components/Login";

const LoginPage = () => {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#08071a]" />}>
      <Login />
    </Suspense>
  );
};

export default LoginPage;
