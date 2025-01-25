import { Link } from "react-router-dom";

export default function DashboardPage() {
  return (
    <div className='dashboard-page'>
      <p>This is the "protected" dashboard page</p>
      <Link to={'/dashboard/join-cruise'}> Join Cruise </Link>
    </div>
  );
}
