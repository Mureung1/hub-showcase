import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/mentor-design-skill.css";
import "./styles/landing-page.css";
import "./styles/signup-role.css";
import "./styles/mentee-signup.css";
import "./styles/mentor-list-coming-soon.css";
import "./styles/mentor-signup.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
