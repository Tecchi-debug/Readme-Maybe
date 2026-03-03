import PageTitle from "../components/PageTitle";
import LoggedInName from "../components/LoggedInName";
import CardUI from "../components/CardUI";
const CardPage = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <PageTitle />
      <LoggedInName />
      <CardUI />
    </div>
  );
};
export default CardPage;
