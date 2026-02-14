import { StrictMode, createElement } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(createElement(StrictMode, null, createElement(App)));
