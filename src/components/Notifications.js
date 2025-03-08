import React from "react";

const Notifications = ({
  notifications,
  challenges,
  username,
  setMessage,
  fetchChallenges,
  fetchNotifications,
}) => {
  const handleAcceptInvite = (notification) => {
    fetch("/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId: notification.id, username }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Accept invite response data:", data);
        setMessage(data.message || data.error);
        fetchChallenges();
        fetchNotifications();
      })
      .catch((err) => {
        console.error("Error accepting invite:", err.message);
        setMessage("Fehler beim Akzeptieren der Einladung: " + err.message);
      });
  };

  const handleRejectInvite = (notification) => {
    fetch("/reject-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId: notification.id, username }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Reject invite response data:", data);
        setMessage(data.message || data.error);
        fetchNotifications();
      })
      .catch((err) => {
        console.error("Error rejecting invite:", err.message);
        setMessage("Fehler beim Ablehnen der Einladung: " + err.message);
      });
  };

  const handleAcceptFriendRequest = (notification) => {
    fetch("/accept-friend-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, friend: notification.invitedBy }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setMessage(data.message || data.error);
        fetchNotifications();
      })
      .catch((err) => {
        console.error("Error accepting friend request:", err.message);
        setMessage(
          "Fehler beim Akzeptieren der Freundschaftsanfrage: " + err.message
        );
      });
  };

  const handleRejectFriendRequest = (notification) => {
    fetch("/reject-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId: notification.id, username }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setMessage(data.message || data.error);
        fetchNotifications();
      })
      .catch((err) => {
        console.error("Error rejecting friend request:", err.message);
        setMessage(
          "Fehler beim Ablehnen der Freundschaftsanfrage: " + err.message
        );
      });
  };

  return (
    <div
      id="notifications-modal"
      className="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl transform transition-all scale-95">
        <h3 className="text-xl font-semibold mb-4 text-green-800">
          Benachrichtigungen 🔔
        </h3>
        {notifications.length === 0 ? (
          <p className="text-gray-600 text-lg">
            Keine neuen Benachrichtigungen.
          </p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="mb-2 flex justify-between items-center p-3 bg-green-50 rounded-2xl hover:bg-yellow-100 transition-all duration-300"
            >
              <span className="text-gray-700 text-lg">
                {notification.message}
              </span>
              <div className="flex gap-2">
                {notification.type === "invite" && notification.challengeId ? (
                  <>
                    <button
                      onClick={() => handleAcceptInvite(notification)}
                      className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-yellow-600 transition-all duration-300 transform hover:scale-110"
                    >
                      Akzeptieren
                    </button>
                    <button
                      onClick={() => handleRejectInvite(notification)}
                      className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-all duration-300 transform hover:scale-110"
                    >
                      Ablehnen
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleAcceptFriendRequest(notification)}
                      className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-yellow-600 transition-all duration-300 transform hover:scale-110"
                    >
                      Akzeptieren
                    </button>
                    <button
                      onClick={() => handleRejectFriendRequest(notification)}
                      className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-all duration-300 transform hover:scale-110"
                    >
                      Ablehnen
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
        <button
          onClick={() =>
            document
              .getElementById("notifications-modal")
              .classList.add("hidden")
          }
          className="mt-4 w-full p-3 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition-all duration-300"
        >
          Schließen
        </button>
      </div>
    </div>
  );
};

export default Notifications;
