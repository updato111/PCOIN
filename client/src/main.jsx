import ReactDOM from "react-dom/client";
import axios from "axios";
import App from "./App.jsx";
import "./index.css";
import { SERVER_URL } from "./constants/index.js";

axios.defaults.baseURL = SERVER_URL;

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
