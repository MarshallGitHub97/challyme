import React from "react";

const LoginForm = ({
  username,
  setUsername,
  password,
  setPassword,
  message,
  setMessage,
  setIsLoggedIn,
}) => {
  const register = () => {
    fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((text) => {
            throw new Error(`HTTP error! status: ${res.status} - ${text}`);
          });
        }
        return res.json();
      })
      .then((data) => setMessage(data.message || data.error))
      .catch((err) => setMessage("Netzwerkfehler: " + err.message));
  };

  const login = () => {
    fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((text) => {
            throw new Error(`HTTP error! status: ${res.status} - ${text}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        if (data.error) {
          setMessage(data.error);
        } else {
          setIsLoggedIn(true);
          setMessage("");
        }
      })
      .catch((err) => setMessage("Netzwerkfehler: " + err.message));
  };

  return (
    <div className="w-full max-w-sm bg-white shadow-2xl rounded-3xl p-6 transform transition-all">
      <h2 className="text-2xl font-semibold text-blue-800 mb-4 text-center">
        Login / Registrieren 💪
      </h2>
      <input
        type="text"
        placeholder="Benutzername"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full p-3 mb-4 border border-blue-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition-all"
      />
      <input
        type="password"
        placeholder="Passwort"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-3 mb-4 border border-blue-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition-all"
      />
      <div className="flex justify-between mb-4 gap-2">
        <button
          onClick={register}
          className="w-full bg-blue-500 text-white px-6 py-2 rounded-full shadow-lg hover:bg-blue-600 transition-all transform hover:scale-105"
        >
          Registrieren
        </button>
        <button
          onClick={login}
          className="w-full bg-green-500 text-white px-6 py-2 rounded-full shadow-lg hover:bg-green-600 transition-all transform hover:scale-105"
        >
          Einloggen
        </button>
      </div>
      {message && <p className="text-center text-red-500">{message}</p>}
    </div>
  );
};

export default LoginForm;
