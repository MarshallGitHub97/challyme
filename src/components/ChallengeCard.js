import React, { useState, useEffect } from "react";

const ChallengeCard = ({
  challenge,
  username,
  friends,
  completeToday,
  setMessage,
  fetchChallenges,
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showMotivation, setShowMotivation] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const motivations = [
    "Nur noch ein paar Stunden! Du schaffst das! 💪",
    "Lass uns das heute rocken! 🚀",
    "Du bist fast da – gib nicht auf! 🌟",
    "Heute ist dein Tag! Los geht’s! 🔥",
  ];

  useEffect(() => {
    const fetchChatMessages = () => {
      fetch(`/challenge-messages?challengeId=${challenge._id}`)
        .then((res) => res.json())
        .then((data) => setChatMessages(data || []))
        .catch((err) =>
          setMessage("Fehler beim Abrufen der Nachrichten: " + err.message)
        );
    };
    fetchChatMessages();
    const interval = setInterval(fetchChatMessages, 5000);
    return () => clearInterval(interval);
  }, [challenge._id, setMessage]);

  useEffect(() => {
    const fetchImages = () => {
      fetch(`/challenge-images?challengeId=${challenge._id}`)
        .then((res) => res.json())
        .then((data) => setImages(data || []))
        .catch((err) =>
          setMessage("Fehler beim Abrufen der Bilder: " + err.message)
        );
    };
    fetchImages();
    const interval = setInterval(fetchImages, 5000);
    return () => clearInterval(interval);
  }, [challenge._id, setMessage]);

  useEffect(() => {
    const checkMotivation = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const today = now.toISOString().split("T")[0];
      const userStreak = challenge.streaks.find((s) => s.user === username) || {
        days: 0,
        lastConfirmed: [],
      };
      const confirmedDates = Array.isArray(userStreak.lastConfirmed)
        ? userStreak.lastConfirmed.map(
            (date) => new Date(date).toISOString().split("T")[0]
          )
        : userStreak.lastConfirmed
        ? [new Date(userStreak.lastConfirmed).toISOString().split("T")[0]]
        : [];
      const hasConfirmedToday = confirmedDates.includes(today);

      if (currentHour >= 20 && !hasConfirmedToday && !challenge.completed) {
        setShowMotivation(true);
      } else {
        setShowMotivation(false);
      }
    };
    checkMotivation();
    const interval = setInterval(checkMotivation, 60000);
    return () => clearInterval(interval);
  }, [challenge, username]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    fetch("/send-challenge-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeId: challenge._id,
        user: username,
        content: newMessage,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message || data.error);
        setNewMessage("");
        fetch(`/challenge-messages?challengeId=${challenge._id}`)
          .then((res) => res.json())
          .then((data) => setChatMessages(data || []));
      })
      .catch((err) =>
        setMessage("Fehler beim Senden der Nachricht: " + err.message)
      );
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Bildgröße darf maximal 5 MB betragen!");
      return;
    }
    const formData = new FormData();
    formData.append("image", file);
    formData.append("challengeId", challenge._id);
    formData.append("username", username);
    formData.append("day", selectedDay || 1);

    fetch("/upload-challenge-image", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message || data.error);
        setShowUploadModal(false);
        setSelectedDay(null);
      })
      .catch((err) =>
        setMessage("Fehler beim Hochladen des Bildes: " + err.message)
      );
  };

  const sendInvite = (friend) => {
    fetch("/send-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeId: challenge._id,
        invitedBy: username,
        invitedUser: friend,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message || data.error);
        setShowInviteModal(false);
        fetchChallenges();
      })
      .catch((err) =>
        setMessage("Fehler beim Senden der Einladung: " + err.message)
      );
  };

  const pokeFriend = (friend) => {
    fetch("/poke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, friend, challengeId: challenge._id }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message || data.error);
      })
      .catch((err) => setMessage("Fehler beim Anstupsen: " + err.message));
  };

  const deleteChallenge = () => {
    if (window.confirm("Möchtest du diese Challenge wirklich löschen?")) {
      fetch("/delete-challenge", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge._id, username }),
      })
        .then((res) => {
          if (!res.ok) {
            return res.text().then((text) => {
              throw new Error(`HTTP-Fehler: ${res.status} - ${text}`);
            });
          }
          return res.json();
        })
        .then((data) => {
          setMessage(data.message || data.error);
          fetchChallenges();
        })
        .catch((err) => {
          console.error("Fehler beim Löschen:", err);
          setMessage("Fehler beim Löschen der Challenge: " + err.message);
        });
    }
  };

  const getProgress = () => {
    const startDate = new Date(challenge.startDate);
    const duration = challenge.duration;
    const userStreak = challenge.streaks.find((s) => s.user === username) || {
      days: 0,
      lastConfirmed: [],
    };
    const confirmedDates = Array.isArray(userStreak.lastConfirmed)
      ? userStreak.lastConfirmed.map(
          (date) => new Date(date).toISOString().split("T")[0]
        )
      : userStreak.lastConfirmed
      ? [new Date(userStreak.lastConfirmed).toISOString().split("T")[0]]
      : [];
    const confirmedDays = userStreak.days;

    const progress = [];
    for (let i = 0; i < duration; i++) {
      const currentDay = i + 1;
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];
      const isConfirmed = confirmedDates.includes(dateStr);
      let status = isConfirmed ? "🔥" : "❌";

      if (!isConfirmed && confirmedDays >= 10 && progress.length === 10) {
        status = "❄️";
      }

      progress.push({
        day: currentDay,
        status: status,
        images: images.filter((img) => img.day === currentDay) || [],
      });
    }
    return progress;
  };

  const today = new Date().toISOString().split("T")[0];
  const userStreak = challenge.streaks.find((s) => s.user === username) || {
    days: 0,
    lastConfirmed: [],
  };
  const confirmedDates = Array.isArray(userStreak.lastConfirmed)
    ? userStreak.lastConfirmed.map(
        (date) => new Date(date).toISOString().split("T")[0]
      )
    : userStreak.lastConfirmed
    ? [new Date(userStreak.lastConfirmed).toISOString().split("T")[0]]
    : [];
  const userHasConfirmedToday = confirmedDates.includes(today);

  const handleCloseModal = (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      setShowDetailsModal(false);
      setShowInviteModal(false);
      setShowChatModal(false);
      setShowUploadModal(false);
      setSelectedImage(null);
      setSelectedDay(null);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-3xl p-6 relative transition-all hover:shadow-2xl hover:bg-green-50">
      <div className="flex flex-col items-start mb-4">
        <h3
          className="text-xl font-bold text-green-800 cursor-pointer hover:text-yellow-500 transition-all duration-300"
          onClick={() => setShowDetailsModal(true)}
        >
          {challenge.title} 🏆
        </h3>
        {challenge.participants.includes(username) && (
          <div className="flex justify-start gap-6 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInviteModal(true);
              }}
              className="text-3xl text-yellow-600 hover:text-green-700 transition-all duration-300"
            >
              🤝
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowChatModal(true);
              }}
              className="text-3xl text-yellow-600 hover:text-green-700 transition-all duration-300"
            >
              💬
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowUploadModal(true);
              }}
              className="text-3xl text-yellow-600 hover:text-green-700 transition-all duration-300"
            >
              📸
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteChallenge();
              }}
              className="text-3xl text-red-500 hover:text-red-700 transition-all duration-300"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {showInviteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 modal-overlay"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4 text-green-800">
              Lade einen Freund ein! 🤝
            </h3>
            <div className="space-y-2">
              {friends.map((friend) => (
                <button
                  key={friend}
                  onClick={(e) => {
                    e.stopPropagation();
                    sendInvite(friend);
                  }}
                  className="w-full p-3 bg-yellow-500 text-white rounded-full hover:bg-green-600 transition-all duration-300 transform hover:scale-105"
                >
                  {friend} einladen
                </button>
              ))}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInviteModal(false);
              }}
              className="mt-4 w-full p-3 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition-all duration-300"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {showDetailsModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-1000 modal-overlay"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4 text-green-800">
              {challenge.title} - Fortschritt 🏆
            </h3>
            <p className="text-gray-600 mb-4">
              Dauer: {challenge.duration} Tage (ab{" "}
              {new Date(challenge.startDate).toLocaleDateString()})
            </p>
            <div className="grid grid-cols-5 gap-2 overflow-y-auto max-h-64">
              {getProgress().map((day, index) => (
                <div
                  key={index}
                  className="text-center p-2 bg-green-50 rounded-full hover:bg-yellow-100 transition-all duration-300 cursor-pointer"
                  onClick={() =>
                    day.images.length > 0 && setSelectedImage(day.images[0])
                  }
                >
                  <span className="block text-xl font-bold text-green-600">
                    Tag {day.day}
                  </span>
                  <span className="text-2xl">{day.status}</span>
                  {day.images.length > 0 && (
                    <span className="text-yellow-500 text-sm">📷</span>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowDetailsModal(false)}
              className="mt-4 w-full p-3 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition-all duration-300"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {showChatModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-1000 modal-overlay"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4 text-green-800">
              Challenge-Chat 💬
            </h3>
            <div className="max-h-64 overflow-y-auto mb-4 p-2 bg-green-50 rounded-xl">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-2 p-2 rounded-lg ${
                    msg.user === username
                      ? "bg-yellow-200 ml-auto text-right"
                      : "bg-gray-200 mr-auto text-left"
                  }`}
                >
                  <p className="text-sm text-gray-600">{msg.user}</p>
                  <p>{msg.content}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Nachricht schreiben..."
                className="w-full p-2 border border-green-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                onClick={sendMessage}
                className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-yellow-600 transition-all duration-300"
              >
                Senden
              </button>
            </div>
            <button
              onClick={() => setShowChatModal(false)}
              className="mt-4 w-full p-3 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition-all duration-300"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-1000 modal-overlay"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4 text-green-800">
              Bild hochladen 📸
            </h3>
            <select
              value={selectedDay || ""}
              onChange={(e) => setSelectedDay(parseInt(e.target.value))}
              className="w-full p-2 mb-4 border border-green-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="">Wähle einen Tag</option>
              {Array.from({ length: challenge.duration }, (_, i) => i + 1).map(
                (day) => (
                  <option key={day} value={day}>
                    Tag {day}
                  </option>
                )
              )}
            </select>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full p-2 border border-green-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button
              onClick={() => setShowUploadModal(false)}
              className="mt-4 w-full p-3 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition-all duration-300"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-1000 modal-overlay"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`/uploads/${selectedImage.path.split("/").pop()}`}
              alt={`Upload von ${selectedImage.user}`}
              className="w-full h-auto max-h-96 object-contain mb-4 rounded-lg"
            />
            <p className="text-gray-600 text-center">
              Hochgeladen von: {selectedImage.user} am{" "}
              {new Date(selectedImage.timestamp).toLocaleString()}
            </p>
            <button
              onClick={() => setSelectedImage(null)}
              className="mt-4 w-full p-3 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition-all duration-300"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {showMotivation && (
        <div className="mb-4 p-3 bg-yellow-100 rounded-xl text-center text-yellow-800 font-semibold animate-pulse">
          {motivations[Math.floor(Math.random() * motivations.length)]}
        </div>
      )}

      <div className="mb-4">
        <h4 className="text-lg font-semibold text-green-700">Teilnehmer:</h4>
        {challenge.participants.map((participant) => {
          const streak = challenge.streaks.find(
            (s) => s.user === participant
          ) || {
            days: 0,
            lastConfirmed: [],
          };
          const confirmedDates = Array.isArray(streak.lastConfirmed)
            ? streak.lastConfirmed.map(
                (date) => new Date(date).toISOString().split("T")[0]
              )
            : streak.lastConfirmed
            ? [new Date(streak.lastConfirmed).toISOString().split("T")[0]]
            : [];
          const hasConfirmedToday = confirmedDates.includes(today);
          const canPoke =
            userHasConfirmedToday &&
            !hasConfirmedToday &&
            participant !== username &&
            friends.includes(participant);

          return (
            <div
              key={participant}
              className="flex justify-between items-center mt-2"
            >
              <span className="text-gray-700 text-lg">{participant}</span>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 font-bold text-lg">
                  🔥 {streak.days}
                </span>
                {canPoke && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      pokeFriend(participant);
                    }}
                    className="text-green-500 hover:text-yellow-600 text-2xl transition-all duration-300"
                  >
                    👈
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center">
        <p className="text-gray-500 text-lg">
          {challenge.duration -
            (challenge.streaks.find((s) => s.user === username)?.days ||
              0)}{" "}
          Tage übrig
        </p>
        {challenge.participants.includes(username) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              completeToday(challenge._id);
            }}
            className={`px-6 py-3 rounded-full shadow-lg transition-all duration-300 z-0 ${
              challenge.completed
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-yellow-500 text-white hover:bg-green-600 hover:text-white"
            }`}
            disabled={challenge.completed}
          >
            {challenge.completed ? "🎉 Erledigt!" : "🎯"}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChallengeCard;
