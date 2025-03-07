import React, { useState, useEffect } from "react";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [challenges, setChallenges] = useState([]);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [friend, setFriend] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isLoggedIn) {
      fetch("http://localhost:3000/challenges")
        .then((res) => res.json())
        .then((data) => setChallenges(data));
      setNotifications(["Peter hat dich angestupst!"]); // Später von API
    }
  }, [isLoggedIn]);

  const register = () => {
    fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => {
        console.log("Response status:", res.status); // Debugging
        return res.json();
      })
      .then((data) => {
        console.log("Response data:", data); // Debugging
        setMessage(data.message || data.error);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setMessage("Network error: " + err.message);
      });
  };

  const login = () => {
    fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => {
        console.log("Login response status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("Login response data:", data);
        if (data.error) {
          setMessage(data.error);
        } else {
          setIsLoggedIn(true);
          setMessage("");
        }
      })
      .catch((err) => {
        console.error("Login fetch error:", err);
        setMessage("Network error: " + err.message);
      });
  };

  const createChallenge = () => {
    fetch("http://localhost:3000/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        duration: Number(duration),
        participants: [username],
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setChallenges([...challenges, data]);
        setTitle("");
        setDuration("");
      });
  };

  const inviteFriend = (challengeId) => {
    fetch("http://localhost:3000/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, friend, challengeId }),
    })
      .then((res) => res.json())
      .then(() => setFriend(""));
  };

  const confirmDay = (challengeId) => {
    fetch("http://localhost:3000/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, challengeId }),
    })
      .then((res) => res.json())
      .then(() => {
        fetch("http://localhost:3000/challenges")
          .then((res) => res.json())
          .then((data) => setChallenges(data));
      });
  };

  const pokeFriend = (challengeId, friend) => {
    fetch("http://localhost:3000/poke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, friend, challengeId }),
    })
      .then((res) => res.json())
      .then((data) => setNotifications([...notifications, data.message]));
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <h1 className="text-3xl font-bold mb-6">Challyme</h1>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full max-w-xs p-3 mb-4 border rounded-lg text-lg"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          className="w-full max-w-xs p-3 mb-4 border rounded-lg text-lg"
        />
        <button
          onClick={register}
          className="w-full max-w-xs p-3 mb-2 bg-blue-500 text-white rounded-lg text-lg"
        >
          Registrieren
        </button>
        <button
          onClick={login}
          className="w-full max-w-xs p-3 bg-green-500 text-white rounded-lg text-lg"
        >
          Anmelden
        </button>
        {message && <p className="mt-4 text-red-500">{message}</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 relative">
      <h1 className="text-2xl font-bold text-center mb-6">
        Challyme ({username})
      </h1>
      <button
        onClick={() => setIsLoggedIn(false)}
        className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-lg text-sm"
      >
        Logout
      </button>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Neue Challenge</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel"
          className="w-full p-3 mb-2 border rounded-lg text-lg"
        />
        <input
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Dauer (Tage)"
          type="number"
          className="w-full p-3 mb-2 border rounded-lg text-lg"
        />
        <button
          onClick={createChallenge}
          className="w-full p-3 bg-blue-500 text-white rounded-lg text-lg"
        >
          Create
        </button>
      </div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Aktive Challenges</h2>
        {challenges.map((ch) => (
          <div key={ch._id} className="bg-white p-4 mb-4 rounded-lg shadow">
            <p className="text-lg font-medium">
              {ch.title} - {ch.duration} Tage{" "}
              {ch.completed ? "(Abgeschlossen)" : ""}
            </p>
            <p className="text-sm">Teilnehmer: {ch.participants.join(", ")}</p>
            <p className="text-sm">
              Streaks:{" "}
              {ch.streaks.map((s) => `${s.user}: ${s.days}`).join(", ")}
            </p>
            {!ch.completed && (
              <div className="mt-2">
                <input
                  value={friend}
                  onChange={(e) => setFriend(e.target.value)}
                  placeholder="Freund einladen"
                  className="w-full p-2 mb-2 border rounded-lg text-sm"
                />
                <button
                  onClick={() => inviteFriend(ch._id)}
                  className="w-full p-2 mb-2 bg-green-500 text-white rounded-lg text-sm"
                >
                  Einladen
                </button>
                <button
                  onClick={() => confirmDay(ch._id)}
                  className="w-full p-2 bg-yellow-500 text-white rounded-lg text-sm"
                >
                  Erledigt!
                </button>
              </div>
            )}
            {ch.completed && (
              <button
                onClick={() =>
                  pokeFriend(ch._id, ch.participants[1] || "peter")
                }
                className="w-full p-2 mt-2 bg-purple-500 text-white rounded-lg text-sm"
              >
                Anstupsen
              </button>
            )}
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Benachrichtigungen</h2>
        <ul className="list-none">
          {notifications.map((n, i) => (
            <li key={i} className="p-2 border-b text-sm">
              {n}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
