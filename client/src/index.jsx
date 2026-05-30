import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./styles/index.css";
import Dashboard from "./pages/Dashboard";
import Top from "./pages/Top";
import Create from "./pages/Create";
import Question from "./pages/Question";
import Answer from "./pages/Answer";
import Login from "./pages/Login";
import Mypage from "./pages/Mypage";
import EditQuiz from "./pages/EditQuiz";
import { NotificationProvider } from "./components/ui/NotificationContext";

//import SendTokenToServerTest from "./SendTokenToServerTest";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <NotificationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Top />} />
          <Route path="/create" element={<Create />} />
          <Route path="/login" element={<Login />} />
          <Route path="/mypage" element={<Mypage />} />
          <Route path="/question/:id" element={<Question />} />
          <Route path="/answer/:id" element={<Answer />} />
          <Route path="/edit/:id" element={<EditQuiz />} />
          {/* <Route path="/send-token-test" element={<SendTokenToServerTest />} /> */}
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  </React.StrictMode>
);
