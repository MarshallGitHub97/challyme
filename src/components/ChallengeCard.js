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
      .catch((err) => setMessage("Error sending invite: " + err.message));
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-800">
          {challenge.title}
        </h3>
        {challenge.participants.includes(username) && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="text-indigo-600 hover:underline text-sm"
          >
            Invite Friend
          </button>
        )}
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Invite a Friend to {challenge.title}
            </h3>
            <div className="space-y-2">
              {friends.map((friend) => (
                <button
                  key={friend}
                  onClick={() => sendInvite(friend)}
                  className="w-full p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Invite {friend}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowInviteModal(false)}
              className="mt-4 w-full p-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mb-2">
        <h4 className="text-sm font-semibold text-gray-700">Participants:</h4>
        {challenge.participants.map((participant) => (
          <div
            key={participant}
            className="flex justify-between items-center mt-1"
          >
            <span className="text-gray-600">{participant}</span>
            <span className="text-orange-500 font-bold">
              🔥{" "}
              {challenge.streaks.find((s) => s.user === participant)?.days || 0}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <p className="text-gray-500">
          {challenge.duration -
            (challenge.streaks.find((s) => s.user === username)?.days ||
              0)}{" "}
          days left
        </p>
        {challenge.participants.includes(username) && (
          <button
            onClick={() => completeToday(challenge._id)}
            className={`px-4 py-2 rounded-lg transition ${
              challenge.completed
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
            disabled={challenge.completed}
          >
            Complete Today
          </button>
        )}
      </div>
    </div>
  );
};

export default ChallengeCard;
