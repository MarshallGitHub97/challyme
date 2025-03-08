import React, { useState } from "react";

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
    const confirmedDays = userStreak.days; // Anzahl der bestätigten Tage

    const progress = [];
    for (let i = 0; i < duration; i++) {
      const currentDay = i + 1;
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];
      const isConfirmed = confirmedDates.includes(dateStr);
      let status = isConfirmed ? "🔥" : "❌";

      // Prüfe, ob nach 10 Tagen ein Tag nicht abgeschlossen wurde
      if (!isConfirmed && confirmedDays >= 10 && progress.length === 10) {
        status = "❄️"; // Erstes nicht abgeschlossenes Tag nach 10 Tagen
      }

      progress.push({
        day: currentDay,
        status: status,
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
  const canPoke =
    userHasConfirmedToday &&
    !hasConfirmedToday &&
    participant !== username &&
    friends.includes(participant);

  // Schließen-Logik für Klick außerhalb des Modals
  const handleCloseModal = (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      setShowDetailsModal(false);
      setShowInviteModal(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-3xl p-6 relative transition-all hover:shadow-2xl hover:bg-blue-50">
      <div className="flex justify-between items-center mb-4">
        <h3
          className="text-xl font-bold text-blue-800 cursor-pointer hover:text-blue-500 transition-all duration-300"
          onClick={() => setShowDetailsModal(true)}
        >
          {challenge.title} 🏆
        </h3>
        <div className="flex gap-2">
          {challenge.participants.includes(username) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInviteModal(true);
              }}
              className="text-blue-600 hover:text-blue-700 text-base transition-all duration-300"
            >
              Freund einladen 🤝
            </button>
          )}
          {challenge.participants.includes(username) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteChallenge();
              }}
              className="text-red-500 hover:text-red-700 text-base transition-all duration-300"
            >
              Löschen 🗑️
            </button>
          )}
        </div>
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
            <h3 className="text-xl font-semibold mb-4 text-blue-800">
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
                  className="w-full p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-300 transform hover:scale-105"
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
            <h3 className="text-xl font-semibold mb-4 text-blue-800">
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
                  className="text-center p-2 bg-blue-50 rounded-full hover:bg-blue-100 transition-all duration-300"
                >
                  <span className="block text-xl font-bold text-blue-600">
                    {day.day}
                  </span>
                  <span className="text-2xl">{day.status}</span>
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

      <div className="mb-4">
        <h4 className="text-lg font-semibold text-blue-700">Teilnehmer:</h4>
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
                <span className="text-blue-500 font-bold text-lg">
                  🔥 {streak.days}
                </span>
                {canPoke && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      pokeFriend(participant);
                    }}
                    className="text-blue-500 hover:text-blue-600 text-base transition-all duration-300"
                  >
                    Anstupsen 👈
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
                : "bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
            }`}
            disabled={challenge.completed}
          >
            Heute abschließen ✅
          </button>
        )}
      </div>
    </div>
  );
};

export default ChallengeCard;
