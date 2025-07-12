import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "./store/index.ts";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CustomThemeProvider } from "./context/ThemeProvider.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Provider store={store}>
            <CustomThemeProvider>
                <BrowserRouter>
                    <ToastContainer position="top-right" />
                    <App />
                </BrowserRouter>
            </CustomThemeProvider>
        </Provider>
    </StrictMode>
);
