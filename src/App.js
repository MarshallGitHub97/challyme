import React, { useState, useEffect } from "react";
import LoginForm from "./components/LoginForm";
import ChallengeCard from "./components/ChallengeCard";
import NewChallengeModal from "./components/NewChallengeModal";
import Notifications from "./components/Notifications";

const App = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [challenges, setChallenges] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [newChallengeTitle, setNewChallengeTitle] = useState("");
  const [newChallengeDuration, setNewChallengeDuration] = useState("");
  const [newChallengeStartDate, setNewChallengeStartDate] = useState("");
  const [newChallengeIsPublic, setNewChallengeIsPublic] = useState(false);
  const [newFriendUsername, setNewFriendUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchChallenges = () => {
    setIsLoading(true);
    fetch("/challenges")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Challenges data:", data);
        setChallenges(data || []);
      })
      .catch((err) => {
        console.error("Error fetching challenges:", err.message);
        setMessage("Error fetching challenges. Check server logs.");
      })
      .finally(() => setIsLoading(false));
  };

  const fetchFriends = () => {
    if (!username) return;
    fetch(`/friends/${username}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Friends data:", data);
        setFriends(data.friends || []);
        setFriendRequests(data.friendRequests || []);
      })
      .catch((err) => console.error("Error fetching friends:", err.message));
  };

  const fetchNotifications = () => {
    if (!username) return;
    fetch(`/friends/${username}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Notifications data:", data);
        setNotifications(data.notifications || []);
      })
      .catch((err) => {
        console.error("Error fetching notifications:", err.message);
        setMessage("Error fetching notifications. Check server logs.");
      });
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchChallenges();
      fetchFriends();
      fetchNotifications();

      const interval = setInterval(() => {
        fetchChallenges();
        fetchNotifications();
      }, 10000); // 10 Sekunden Intervall

      return () => clearInterval(interval);
    }
  }, [isLoggedIn, username]);

  const createChallenge = () => {
    fetch("/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newChallengeTitle,
        duration: parseInt(newChallengeDuration),
        startDate: newChallengeStartDate
          ? newChallengeStartDate
          : new Date().toISOString().split("T")[0],
        participants: [username],
        isPublic: newChallengeIsPublic,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setChallenges([...challenges, data]);
        setNewChallengeTitle("");
        setNewChallengeDuration("");
        setNewChallengeStartDate("");
        setNewChallengeIsPublic(false);
      })
      .catch((err) => console.error("Error creating challenge:", err));
  };

  const completeToday = (challengeId) => {
    fetch("/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, challengeId }),
    })
      .then((res) => {
        console.log("Confirm response status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("Confirm response data:", data);
        if (data.error) {
          setMessage(data.error);
        } else {
          const updatedChallenges = challenges.map((ch) => {
            if (ch._id === challengeId) {
              const streak = ch.streaks.find((s) => s.user === username) || {
                days: 0,
              };
              streak.days = data.days || streak.days;
              ch.completed = data.completed || ch.completed;
            }
            return ch;
          });
          setChallenges(updatedChallenges);
          setMessage(data.message || "Challenge updated!");
        }
      })
      .catch((err) => setMessage("Error completing challenge: " + err.message));
  };

  const sendFriendRequest = () => {
    fetch("/send-friend-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUser: username, toUser: newFriendUsername }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message || data.error);
        setNewFriendUsername("");
        fetchFriends();
      })
      .catch((err) =>
        setMessage("Error sending friend request: " + err.message),
      );
  };

  const acceptFriendRequest = (friend) => {
    fetch("/accept-friend-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, friend }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message || data.error);
        fetchFriends();
      })
      .catch((err) =>
        setMessage("Error accepting friend request: " + err.message),
      );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex flex-col items-center p-4">
      <h1 className="text-4xl font-bold text-purple-600 mb-6 tracking-wide animate-bounce">
        Challyme
      </h1>

      {!isLoggedIn ? (
        <LoginForm
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          message={message}
          setMessage={setMessage}
          setIsLoggedIn={setIsLoggedIn}
        />
      ) : (
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-purple-800">
              Hallo, {username}! 🎉
            </h2>
            <div className="relative">
              <button
                onClick={() =>
                  document
                    .getElementById("notifications-modal")
                    .classList.toggle("hidden")
                }
                className="bg-purple-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-600 transition-all transform hover:scale-105 flex items-center"
              >
                <span className="mr-2">🔔</span> Benachrichtigungen
                {notifications.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <Notifications
            notifications={notifications}
            challenges={challenges}
            username={username}
            setMessage={setMessage}
            fetchChallenges={fetchChallenges}
            fetchNotifications={fetchNotifications}
          />

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-purple-700 mb-2">
              Freund hinzufügen 🌟
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Freundes-Benutzername"
                value={newFriendUsername}
                onChange={(e) => setNewFriendUsername(e.target.value)}
                className="w-full p-3 border border-purple-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm transition-all"
              />
              <button
                onClick={sendFriendRequest}
                className="bg-purple-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-600 transition-all transform hover:scale-105"
              >
                Anfrage senden
              </button>
            </div>
            {friendRequests.length > 0 && (
              <div className="mt-4">
                <h4 className="text-md font-semibold text-purple-600">
                  Freundschaftsanfragen
                </h4>
                {friendRequests.map((friend) => (
                  <div
                    key={friend}
                    className="flex justify-between items-center mt-2 p-2 bg-white rounded-lg shadow-md"
                  >
                    <span className="text-gray-700">{friend}</span>
                    <button
                      onClick={() => acceptFriendRequest(friend)}
                      className="bg-green-500 text-white px-4 py-1 rounded-full hover:bg-green-600 transition-all transform hover:scale-105"
                    >
                      Akzeptieren
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end mb-6">
            <button
              onClick={() => {
                setNewChallengeTitle("");
                setNewChallengeDuration("");
                setNewChallengeStartDate("");
                setNewChallengeIsPublic(false);
                document
                  .getElementById("new-challenge-modal")
                  .classList.toggle("hidden");
              }}
              className="bg-purple-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-600 transition-all transform hover:scale-105 flex items-center"
            >
              <span className="mr-2">✨</span> Neue Challenge
            </button>
          </div>

          <NewChallengeModal
            newChallengeTitle={newChallengeTitle}
            setNewChallengeTitle={setNewChallengeTitle}
            newChallengeDuration={newChallengeDuration}
            setNewChallengeDuration={setNewChallengeDuration}
            newChallengeStartDate={newChallengeStartDate}
            setNewChallengeStartDate={setNewChallengeStartDate}
            newChallengeIsPublic={newChallengeIsPublic}
            setNewChallengeIsPublic={setNewChallengeIsPublic}
            createChallenge={createChallenge}
          />

          {isLoading && (
            <p className="text-center text-purple-500 animate-pulse">
              Laden... ⏳
            </p>
          )}
          <div className="space-y-4">
            {challenges
              .filter((challenge) => challenge.participants.includes(username))
              .map((challenge) => (
                <ChallengeCard
                  key={challenge._id}
                  challenge={challenge}
                  username={username}
                  friends={friends}
                  completeToday={completeToday}
                  setMessage={setMessage}
                  fetchChallenges={fetchChallenges}
                />
              ))}
          </div>
          {message && (
            <p className="text-center text-red-500 mt-4">{message}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
