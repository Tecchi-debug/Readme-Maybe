import LoginPage from "./Login/page";
import CardPage from "./PageCard/page";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <LoginPage />
    </div>
  );
}
