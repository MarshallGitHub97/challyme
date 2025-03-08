import React, { useState, useEffect } from "react";

const FriendsTab = ({ username, friends, setMessage }) => {
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (selectedFriend) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000); // Alle 5 Sekunden aktualisieren
      return () => clearInterval(interval);
    }
  }, [selectedFriend]);

  const fetchMessages = () => {
    if (!selectedFriend) return;
    fetch(
      `/messages?user1=${encodeURIComponent(
        username
      )}&user2=${encodeURIComponent(selectedFriend)}`
    )
      .then((res) => res.json())
      .then((data) => setMessages(data || []))
      .catch((err) =>
        setMessage("Fehler beim Abrufen der Nachrichten: " + err.message)
      );
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedFriend) return;
    fetch("/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromUser: username,
        toUser: selectedFriend,
        content: newMessage,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message || data.error);
        setNewMessage("");
        fetchMessages();
      })
      .catch((err) =>
        setMessage("Fehler beim Senden der Nachricht: " + err.message)
      );
  };

  return (
    <div className="w-full">
      <h3 className="text-xl font-semibold text-green-700 mb-4">
        Deine Freunde 👥
      </h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {friends.map((friend) => (
          <button
            key={friend}
            onClick={() => setSelectedFriend(friend)}
            className={`p-3 rounded-2xl shadow-md transition-all duration-300 ${
              selectedFriend === friend
                ? "bg-yellow-500 text-white"
                : "bg-white hover:bg-green-50"
            }`}
          >
            {friend}
          </button>
        ))}
      </div>

      {selectedFriend && (
        <div className="bg-white rounded-3xl p-4 shadow-lg">
          <h4 className="text-lg font-semibold text-green-800 mb-2">
            Chat mit {selectedFriend} 💬
          </h4>
          <div className="max-h-64 overflow-y-auto mb-4 p-2 bg-green-50 rounded-xl">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-2 p-2 rounded-lg ${
                  msg.fromUser === username
                    ? "bg-yellow-200 ml-auto text-right"
                    : "bg-gray-200 mr-auto text-left"
                }`}
              >
                <p className="text-sm text-gray-600">{msg.fromUser}</p>
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
        </div>
      )}
    </div>
  );
};

export default FriendsTab;
