import { createRoot } from "react-dom/client";
import "../src/styles.css";
import { Starfield } from "../src/starfield/Starfield";

createRoot(document.getElementById("root")!).render(<Starfield />);
