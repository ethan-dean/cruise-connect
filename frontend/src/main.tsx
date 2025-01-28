import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import { ProfileDoneProvider } from "./contexts/ProfileDoneContext";
import createRouter from "./Router";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <ProfileDoneProvider>
        <RouterProvider router={createRouter()} />
      </ProfileDoneProvider>
    </AuthProvider>
  </React.StrictMode>,
);
