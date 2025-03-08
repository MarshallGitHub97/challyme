import React from "react";

const Notifications = ({
  notifications,
  challenges,
  username,
  setMessage,
  fetchChallenges,
  fetchNotifications,
  setNotifications,
  isVisible,
  onClose,
}) => {
  if (!isVisible) return null;

  const acceptInvite = (challengeId) => {
    fetch("/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, challengeId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setMessage(data.message || data.error);
        fetchChallenges();
        fetchNotifications();
        const updatedNotifications = notifications.map((n) =>
          n.challengeId === challengeId ? { ...n, status: "accepted" } : n
        );
        setNotifications(updatedNotifications);
      })
      .catch((err) =>
        setMessage("Fehler beim Akzeptieren der Einladung: " + err.message)
      );
  };

  const declineInvite = (challengeId) => {
    fetch("/decline-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, challengeId }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message || data.error);
        fetchChallenges();
        fetchNotifications();
        const updatedNotifications = notifications.map((n) =>
          n.challengeId === challengeId ? { ...n, status: "declined" } : n
        );
        setNotifications(updatedNotifications);
      })
      .catch((err) =>
        setMessage("Fehler beim Ablehnen der Einladung: " + err.message)
      );
  };

  const acceptFriendRequest = (friend) => {
    fetch("/accept-friend-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, friend }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setMessage(data.message || data.error);
        fetchNotifications();
        const updatedNotifications = notifications.map((n) =>
          n.friend === friend ? { ...n, status: "accepted" } : n
        );
        setNotifications(updatedNotifications);
      })
      .catch((err) =>
        setMessage(
          "Fehler beim Akzeptieren der Freundschaftsanfrage: " + err.message
        )
      );
  };

  const declineFriendRequest = (friend) => {
    fetch("/decline-friend-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, friend }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message || data.error);
        fetchNotifications();
        const updatedNotifications = notifications.map((n) =>
          n.friend === friend ? { ...n, status: "declined" } : n
        );
        setNotifications(updatedNotifications);
      })
      .catch((err) =>
        setMessage(
          "Fehler beim Ablehnen der Freundschaftsanfrage: " + err.message
        )
      );
  };

  const handleModalOpen = () => {
    const updatedNotifications = notifications.map((n) => ({
      ...n,
      seen: true,
    }));
    setNotifications(updatedNotifications);
  };

  const visibleNotifications = notifications.filter(
    (notification) =>
      (!notification.status || notification.status === "pending") &&
      notification.message
  );

  const unseenCount = notifications.filter(
    (n) => !n.seen && (!n.status || n.status === "pending")
  ).length;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target.classList.contains("modal-overlay")) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold mb-4 text-green-800">
          Benachrichtigungen 🔔
        </h3>
        {visibleNotifications.length === 0 ? (
          <p className="text-center text-gray-500">
            Keine neuen Benachrichtigungen.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-4">
            {visibleNotifications.map((notification, index) => (
              <div
                key={index}
                className="p-3 bg-green-50 rounded-xl shadow-md hover:bg-yellow-100 transition-all duration-300"
              >
                <p className="text-gray-700">{notification.message}</p>
                {notification.type === "invite" && (
                  <div className="mt-2 flex justify-between">
                    <button
                      onClick={() => acceptInvite(notification.challengeId)}
                      className="bg-green-500 text-white px-3 py-1 rounded-full hover:bg-yellow-600 transition-all duration-300"
                    >
                      Akzeptieren
                    </button>
                    <button
                      onClick={() => declineInvite(notification.challengeId)}
                      className="bg-gray-300 text-gray-800 px-3 py-1 rounded-full hover:bg-gray-400 transition-all duration-300"
                    >
                      Ablehnen
                    </button>
                  </div>
                )}
                {notification.type === "friend_request" && (
                  <div className="mt-2 flex justify-between">
                    <button
                      onClick={() => acceptFriendRequest(notification.friend)}
                      className="bg-green-500 text-white px-3 py-1 rounded-full hover:bg-yellow-600 transition-all duration-300"
                    >
                      Akzeptieren
                    </button>
                    <button
                      onClick={() => declineFriendRequest(notification.friend)}
                      className="bg-gray-300 text-gray-800 px-3 py-1 rounded-full hover:bg-gray-400 transition-all duration-300"
                    >
                      Ablehnen
                    </button>
                  </div>
                )}
                {notification.type === "missed_day" && (
                  <p className="text-yellow-600 mt-2">
                    Bestätige bald, um deine Streak zu halten!
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        <button
          onClick={onClose}
          className="mt-4 w-full p-3 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition-all duration-300"
        >
          Schließen
        </button>
      </div>
    </div>
  );
};

export default Notifications;
