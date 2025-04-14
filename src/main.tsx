import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { Provider } from "./provider.tsx";
import { AuthProvider } from "@/contexts/AuthContext"; // Import AuthProvider
import "@/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  // <React.StrictMode> {/* Temporarily removed for debugging */}
    <BrowserRouter>
      <AuthProvider> {/* Wrap with AuthProvider */}
        <Provider>
          <App />
        </Provider>
      </AuthProvider>
    </BrowserRouter>
  // </React.StrictMode>,
);
