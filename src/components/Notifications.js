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
    console.log("Accept invite clicked for:", notification);
    const challengeTitleMatch = notification.match(
      /hat dich zu "([^"]+)" eingeladen!/
    );
    if (!challengeTitleMatch) {
      setMessage("Ungültiges Benachrichtigungsformat");
      return;
    }

    const challengeTitle = challengeTitleMatch[1];
    const challenge = challenges.find((ch) => ch.title === challengeTitle);
    if (!challenge) {
      setMessage("Challenge nicht gefunden");
      return;
    }

    const invitedByMatch = notification.match(/([^ ]+) hat dich/);
    const invitedBy = invitedByMatch ? invitedByMatch[1] : null;
    if (!invitedBy) {
      setMessage("Einladender konnte nicht ermittelt werden");
      return;
    }

    fetch("/get-invite-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invitedBy,
        invitedUser: username,
        challengeTitle,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Get invite ID response data:", data);
        if (data.error) {
          setMessage(data.error);
          return;
        }

        const inviteId = data.inviteId;
        return fetch("/accept-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteId, username }),
        });
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
    console.log("Reject invite clicked for:", notification);
    const challengeTitleMatch = notification.match(
      /hat dich zu "([^"]+)" eingeladen!/
    );
    if (!challengeTitleMatch) {
      setMessage("Ungültiges Benachrichtigungsformat");
      return;
    }

    const challengeTitle = challengeTitleMatch[1];
    const challenge = challenges.find((ch) => ch.title === challengeTitle);
    if (!challenge) {
      setMessage("Challenge nicht gefunden");
      return;
    }

    const invitedByMatch = notification.match(/([^ ]+) hat dich/);
    const invitedBy = invitedByMatch ? invitedByMatch[1] : null;
    if (!invitedBy) {
      setMessage("Einladender konnte nicht ermittelt werden");
      return;
    }

    fetch("/get-invite-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invitedBy,
        invitedUser: username,
        challengeTitle,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Get invite ID response data:", data);
        if (data.error) {
          setMessage(data.error);
          return;
        }

        const inviteId = data.inviteId;
        return fetch("/reject-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteId, username }),
        });
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

  return (
    <div
      id="notifications-modal"
      className="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl transform transition-all scale-95 animate-bounce">
        <h3 className="text-lg font-semibold mb-4 text-blue-800">
          Benachrichtigungen 🔔
        </h3>
        {notifications.length === 0 ? (
          <p className="text-gray-600">Keine neuen Benachrichtigungen.</p>
        ) : (
          notifications.map((notification, index) => (
            <div
              key={index}
              className="mb-2 flex justify-between items-center p-2 bg-blue-50 rounded-lg"
            >
              <span className="text-gray-700 text-sm">{notification}</span>
              {notification.includes("hat dich zu") && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptInvite(notification)}
                    className="bg-green-500 text-white px-3 py-1 rounded-full hover:bg-green-600 transition-all transform hover:scale-105"
                  >
                    Akzeptieren
                  </button>
                  <button
                    onClick={() => handleRejectInvite(notification)}
                    className="bg-red-500 text-white px-3 py-1 rounded-full hover:bg-red-600 transition-all transform hover:scale-105"
                  >
                    Ablehnen
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        <button
          onClick={() =>
            document
              .getElementById("notifications-modal")
              .classList.add("hidden")
          }
          className="mt-4 w-full p-2 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition-all"
        >
          Schließen
        </button>
      </div>
    </div>
  );
};

export default Notifications;
