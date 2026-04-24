import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { connectSocket } from "./lib/sockets.ts";

// Reconnect socket once on page load if token exists
const savedToken = localStorage.getItem("accessToken");
if (savedToken) {
    connectSocket(savedToken);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    // <StrictMode>
    <App />,
    // </StrictMode>,
);
