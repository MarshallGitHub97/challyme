import React, { useState, useEffect } from "react";
import LoginForm from "./components/LoginForm";
import ChallengeCard from "./components/ChallengeCard";
import NewChallengeModal from "./components/NewChallengeModal";
import Notifications from "./components/Notifications";
import FriendsTab from "./components/FriendsTab";

const App = () => {
  const [username, setUsername] = useState(
    () => localStorage.getItem("username") || ""
  );
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem("isLoggedIn") === "true"
  );
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
  const [points, setPoints] = useState(0);
  const [activeTab, setActiveTab] = useState("challenges");

  const fetchChallenges = () => {
    setIsLoading(true);
    fetch(`/challenges?username=${encodeURIComponent(username)}`)
      .then((res) => {
        if (!res.ok) {
          console.error("Fetch challenges failed with status:", res.status);
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Challenges data:", data);
        setChallenges(data || []);
      })
      .catch((err) => {
        console.error("Error fetching challenges:", err.message);
        setMessage(
          "Error fetching challenges. Check server logs: " + err.message
        );
      })
      .finally(() => setIsLoading(false));
  };

  const fetchFriends = () => {
    if (!username) return;
    fetch(`/friends?username=${encodeURIComponent(username)}`)
      .then((res) => {
        if (!res.ok) {
          console.error("Fetch friends failed with status:", res.status);
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Friends data:", data);
        setFriends(data.friends || []);
        setFriendRequests(data.friendRequests || []);
      })
      .catch((err) => {
        console.error("Error fetching friends:", err.message);
        setMessage("Error fetching friends. Check server logs: " + err.message);
      });
  };

  const fetchNotifications = () => {
    if (!username) return;
    fetch(`/notifications?username=${encodeURIComponent(username)}`)
      .then((res) => {
        if (!res.ok) {
          console.error("Fetch notifications failed with status:", res.status);
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Notifications data:", data);
        setNotifications(data || []);
      })
      .catch((err) => {
        console.error("Error fetching notifications:", err.message);
        setMessage(
          "Error fetching notifications. Check server logs: " + err.message
        );
      });
  };

  useEffect(() => {
    if (isLoggedIn && username) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          await Promise.all([
            fetchChallenges(),
            fetchFriends(),
            fetchNotifications(),
          ]);
        } catch (err) {
          setMessage(`Fehler beim Laden der Daten: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();

      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, username]);

  const createChallenge = () => {
    fetch("/create-challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newChallengeTitle,
        duration: parseInt(newChallengeDuration),
        startDate:
          newChallengeStartDate || new Date().toISOString().split("T")[0],
        username,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setMessage(data.error);
        } else {
          setChallenges([...challenges, data.challenge]);
          setNewChallengeTitle("");
          setNewChallengeDuration("");
          setNewChallengeStartDate("");
          setNewChallengeIsPublic(false);
          setMessage("Challenge erfolgreich erstellt!");
        }
      })
      .catch((err) => {
        console.error("Error creating challenge:", err.message);
        setMessage("Error creating challenge: " + err.message);
      });
  };

  const completeToday = (challengeId) => {
    fetch("/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, challengeId }),
    })
      .then((res) => {
        console.log("Confirm response status:", res.status);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
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
          setPoints(data.points || points);
          setMessage(
            data.message + ` (+${data.points - points} Punkte)` ||
              "Challenge updated!"
          );
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
      .then((res) => {
        if (!res.ok) {
          return res.text().then((text) => {
            throw new Error(`HTTP error! status: ${res.status} - ${text}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        setMessage(data.message || "Unbekannter Fehler");
        setNewFriendUsername("");
        fetchFriends();
      })
      .catch((err) => {
        console.error("Error sending friend request:", err.message);
        setMessage("Error sending friend request: " + err.message);
      });
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
      .catch((err) => {
        console.error("Error accepting friend request:", err.message);
        setMessage("Error accepting friend request: " + err.message);
      });
  };

  const handleLogout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    setChallenges([]);
    setFriends([]);
    setFriendRequests([]);
    setNotifications([]);
    setPoints(0);
    setMessage("Erfolgreich abgemeldet!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-yellow-50 flex flex-col items-center p-4">
      <h1 className="text-5xl font-bold text-green-600 mb-8 tracking-wide animate-bounce-once">
        Challyme 🏆
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
          {message && (
            <p className="text-center text-red-500 mb-4 bg-white p-2 rounded-xl shadow-md">
              {message}
            </p>
          )}
          <div className="flex flex-col items-center mb-6">
            <div className="flex gap-4 mb-4">
              <button
                onClick={() =>
                  document
                    .getElementById("notifications-modal")
                    .classList.toggle("hidden")
                }
                className="relative bg-blue-500 text-white px-4 py-4 rounded-full shadow-lg hover:bg-blue-600 transition-all duration-300 transform hover:scale-110 animate-pulse"
              >
                🔔
                {notifications.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-bounce">
                    {notifications.length}
                  </span>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-4 rounded-full shadow-lg hover:bg-red-600 transition-all duration-300 transform hover:scale-110"
              >
                🚪
              </button>
            </div>
            <h2 className="text-2xl font-semibold text-green-700 text-center">
              Hallo, {username}!<br />
              💪 Du rockst das! Punkte: {points}
            </h2>
          </div>

          <Notifications
            notifications={notifications}
            challenges={challenges}
            username={username}
            setMessage={setMessage}
            fetchChallenges={fetchChallenges}
            fetchNotifications={fetchNotifications}
          />

          <div className="flex justify-start mb-4 space-x-2">
            <button
              onClick={() => setActiveTab("challenges")}
              className={`px-4 py-2 rounded-full shadow-lg transition-all duration-300 ${
                activeTab === "challenges"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              Challenges
            </button>
            <button
              onClick={() => setActiveTab("friends")}
              className={`px-4 py-2 rounded-full shadow-lg transition-all duration-300 ${
                activeTab === "friends"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              Freunde
            </button>
          </div>

          {activeTab === "challenges" && (
            <>
              <div className="mb-6">
                <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:bg-green-50 transition-all duration-300">
                  <h3 className="text-xl font-semibold text-green-700 mb-4">
                    Freund hinzufügen 🤝
                  </h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Freundes-Benutzername"
                      value={newFriendUsername}
                      onChange={(e) => setNewFriendUsername(e.target.value)}
                      className="w-full p-2 border border-green-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-md transition-all duration-300"
                    />
                    <button
                      onClick={sendFriendRequest}
                      className="bg-yellow-500 text-white p-2 rounded-full shadow-lg hover:bg-green-600 transition-all duration-300 transform hover:scale-110"
                    >
                      ➕
                    </button>
                  </div>
                  {friendRequests.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-lg font-semibold text-green-600">
                        Freundschaftsanfragen
                      </h4>
                      {friendRequests.map((friend) => (
                        <div
                          key={friend}
                          className="flex justify-between items-center mt-2 p-3 bg-white rounded-2xl shadow-md hover:bg-green-50 transition-all duration-300"
                        >
                          <span className="text-gray-700 text-lg">
                            {friend}
                          </span>
                          <button
                            onClick={() => acceptFriendRequest(friend)}
                            className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-yellow-600 transition-all duration-300 transform hover:scale-110"
                          >
                            Akzeptieren
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                  className="bg-yellow-500 text-white px-5 py-3 rounded-full shadow-lg hover:bg-green-600 transition-all duration-300 transform hover:scale-110 flex items-center"
                >
                  <span className="mr-2">🏆</span> Neue Challenge
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
                <p className="text-center text-green-500 text-xl animate-pulse">
                  Laden... ⏳
                </p>
              )}
              {challenges.length === 0 && !isLoading && (
                <p className="text-center text-gray-500 text-lg">
                  Keine Challenges gefunden. Erstelle eine neue!
                </p>
              )}
              <div className="space-y-4">
                {challenges
                  .filter((challenge) =>
                    challenge.participants.includes(username)
                  )
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
            </>
          )}

          {activeTab === "friends" && (
            <FriendsTab
              username={username}
              friends={friends}
              setMessage={setMessage}
            />
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes bounce-once {
          0%,
          20%,
          50%,
          80%,
          100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-30px);
          }
          60% {
            transform: translateY(-15px);
          }
        }
        .animate-bounce-once {
          animation: bounce-once 1s ease;
        }
      `}</style>
    </div>
  );
};

export default App;
