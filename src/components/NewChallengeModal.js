import React from "react";

const NewChallengeModal = ({
  newChallengeTitle,
  setNewChallengeTitle,
  newChallengeDuration,
  setNewChallengeDuration,
  newChallengeStartDate,
  setNewChallengeStartDate,
  newChallengeIsPublic,
  setNewChallengeIsPublic,
  createChallenge,
}) => {
  const closeModal = () => {
    document.getElementById("new-challenge-modal").classList.add("hidden");
  };

  return (
    <div
      id="new-challenge-modal"
      className="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl transform transition-all scale-95 animate-bounce">
        <h3 className="text-lg font-semibold mb-4 text-purple-800">
          Neue Challenge erstellen 🌟
        </h3>
        <input
          type="text"
          placeholder="Challenge-Titel"
          value={newChallengeTitle}
          onChange={(e) => setNewChallengeTitle(e.target.value)}
          className="w-full p-3 mb-4 border border-purple-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm transition-all"
        />
        <input
          type="number"
          placeholder="Dauer (Tage)"
          value={newChallengeDuration}
          onChange={(e) => setNewChallengeDuration(e.target.value)}
          className="w-full p-3 mb-4 border border-purple-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm transition-all"
        />
        <input
          type="date"
          value={newChallengeStartDate || ""}
          onChange={(e) => setNewChallengeStartDate(e.target.value)}
          className="w-full p-3 mb-4 border border-purple-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-sm transition-all"
        />
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={newChallengeIsPublic}
              onChange={(e) => setNewChallengeIsPublic(e.target.checked)}
              className="mr-2"
            />
            Diese Challenge öffentlich machen
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={closeModal}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full hover:bg-gray-400 transition-all"
          >
            Abbrechen
          </button>
          <button
            onClick={() => {
              createChallenge();
              closeModal();
            }}
            className="bg-purple-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-600 transition-all transform hover:scale-105"
          >
            Erstellen
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewChallengeModal;
