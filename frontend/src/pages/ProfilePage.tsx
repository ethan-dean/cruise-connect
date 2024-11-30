import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export default function ProfilePage() {
  const { logout } = useContext(AuthContext);

  return (
    <div className='profile-page'>
      <button onClick={logout}>Log out</button>
      <p>This is the "protected" profile page</p>
    </div>
  );
}
