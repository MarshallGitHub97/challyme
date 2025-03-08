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
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl transform transition-all scale-95">
        <h3 className="text-xl font-semibold mb-4 text-green-800">
          Neue Challenge erstellen 🏆
        </h3>
        <input
          type="text"
          placeholder="Challenge-Titel"
          value={newChallengeTitle}
          onChange={(e) => setNewChallengeTitle(e.target.value)}
          className="w-full p-3 mb-4 border border-green-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-md transition-all duration-300"
        />
        <input
          type="number"
          placeholder="Dauer (Tage)"
          value={newChallengeDuration}
          onChange={(e) => setNewChallengeDuration(e.target.value)}
          className="w-full p-3 mb-4 border border-green-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-md transition-all duration-300"
        />
        <input
          type="date"
          value={newChallengeStartDate || ""}
          onChange={(e) => setNewChallengeStartDate(e.target.value)}
          className="w-full p-3 mb-4 border border-green-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-md transition-all duration-300"
        />
        <div className="mb-4">
          <label className="flex items-center text-lg">
            <input
              type="checkbox"
              checked={newChallengeIsPublic}
              onChange={(e) => setNewChallengeIsPublic(e.target.checked)}
              className="mr-2 h-5 w-5"
            />
            Diese Challenge öffentlich machen
          </label>
        </div>
        <div className="flex justify-end gap-4">
          <button
            onClick={closeModal}
            className="bg-gray-300 text-gray-800 px-5 py-3 rounded-full hover:bg-gray-400 transition-all duration-300"
          >
            Abbrechen
          </button>
          <button
            onClick={() => {
              createChallenge();
              closeModal();
            }}
            className="bg-yellow-500 text-white px-5 py-3 rounded-full shadow-lg hover:bg-green-600 transition-all duration-300 transform hover:scale-110"
          >
            Erstellen
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewChallengeModal;
